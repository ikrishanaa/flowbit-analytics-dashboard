import os
import re
from typing import Any, Dict, List
import json

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy import inspect

try:
    # Optional: use Vanna to help prompting/SQL generation if desired
    import vanna
    from vanna.base import VannaBase
except Exception:
    vanna = None
    VannaBase = object  # type: ignore

try:
    from groq import Groq
except Exception:
    Groq = None  # type: ignore

DATABASE_URL = os.getenv("VANNA__DATABASE_URL") or os.getenv("DATABASE_URL")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
PORT = int(os.getenv("PORT", "8000"))
CORS_ORIGIN = os.getenv("CORS_ORIGIN", "*")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL not configured for Vanna service")

engine: Engine = create_engine(DATABASE_URL)

app = FastAPI(title="Flowbit Vanna Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in CORS_ORIGIN.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    question: str


def get_schema_snapshot() -> str:
    inspector = inspect(engine)
    lines: List[str] = []
    for table_name in inspector.get_table_names():
        cols = inspector.get_columns(table_name)
        # Quote identifiers to reflect actual case-sensitive names used by Prisma
        col_str = ", ".join([f'"{c["name"]}" {str(c.get("type"))}' for c in cols])
        lines.append(f'TABLE "{table_name}": {col_str}')
    return "\n".join(lines)


def extract_sql(text_content: str) -> str:
    # Try to pull code block
    m = re.search(r"```sql\s*([\s\S]*?)```", text_content, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    # Fallback: the whole text
    return text_content.strip()


def limit_sql(sql: str) -> str:
    # Add a LIMIT if not present for safety
    if re.search(r"\blimit\b", sql, re.IGNORECASE):
        return sql
    return sql.rstrip("; ") + " LIMIT 200;"


def quote_identifiers(sql: str) -> str:
    """Best-effort quoting of identifiers to match Prisma's case-sensitive names.
    - Quotes table names that appear after FROM/JOIN
    - Quotes column names appearing as alias.column
    This is heuristic but robust for our generated patterns.
    """
    try:
        insp = inspect(engine)
        table_names = insp.get_table_names()
    except Exception:
        table_names = []

    # Quote table names after FROM/JOIN
    table_cands = set()
    for tn in table_names:
        t = tn.strip('"')
        table_cands.add(t)
        table_cands.add(tn)
    for t in sorted(table_cands, key=len, reverse=True):
        pattern = re.compile(rf"(?i)(\bFROM\s+|\bJOIN\s+){re.escape(t)}(\b)")
        t_clean = t.strip('"')
        sql = pattern.sub(lambda m, s=t_clean: m.group(1) + '"' + s + '"' + m.group(2), sql)

    # Quote alias.column -> alias."column"
    sql = re.sub(r"\b([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\b", r"\1.\"\2\"", sql)
    return sql


@app.get("/health")
async def health():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"ok": True}


@app.post("/chat")
async def chat(req: ChatRequest):
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")

    schema = get_schema_snapshot()

    system_prompt = (
        "You are a SQL expert for a PostgreSQL database. "
        "Given a natural-language question and the database schema, generate a single optimized SQL query that answers the question. "
        "Only output the SQL inside a code block. Avoid DDL or writes. Use identifiers exactly as in the schema and ALWAYS wrap table and column names in double quotes (e.g., \"Invoice\".\"invoiceDate\")."
    )

    user_prompt = f"""
Database Schema:\n{schema}\n\nQuestion: {req.question}\n\nReturn only SQL in a single code block.
"""

    if Groq is None:
        raise HTTPException(status_code=500, detail="groq python package not installed")

    client = Groq(api_key=GROQ_API_KEY)
    completion = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.1,
    )

    content = completion.choices[0].message.content or ""
    sql = quote_identifiers(limit_sql(extract_sql(content)))

    # Execute SQL
    try:
        with engine.connect() as conn:
            result = conn.execute(text(sql))
            cols = list(result.keys())
            rows = [list(r) for r in result.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=400, detail={"sql": sql, "error": str(e)})

    return {"sql": sql, "columns": cols, "rows": rows}


@app.get("/chat-stream")
async def chat_stream(question: str):
    """Server-Sent Events stream for incremental SQL + results."""
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")
    if Groq is None:
        raise HTTPException(status_code=500, detail="groq python package not installed")

    schema = get_schema_snapshot()

    system_prompt = (
        "You are a SQL expert for a PostgreSQL database. "
        "Given a natural-language question and the database schema, generate a single optimized SQL query that answers the question. "
        "Only output the SQL inside a code block. Avoid DDL or writes. Use identifiers exactly as in the schema and ALWAYS wrap table and column names in double quotes (e.g., \"Invoice\".\"invoiceDate\")."
    )
    user_prompt = f"""
Database Schema:\n{schema}\n\nQuestion: {question}\n\nReturn only SQL in a single code block.
"""

    def gen():
        try:
            client = Groq(api_key=GROQ_API_KEY)
            stream = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
                temperature=0.1,
                stream=True,
            )
            parts: List[str] = []
            for chunk in stream:
                try:
                    choice = chunk.choices[0]
                    content = getattr(getattr(choice, "delta", None), "content", None) or getattr(getattr(choice, "message", None), "content", None)
                    if content:
                        parts.append(content)
                        yield f"event: delta\ndata: {json.dumps(content)}\n\n"
                except Exception:
                    continue

            content = "".join(parts)
            sql = quote_identifiers(limit_sql(extract_sql(content)))
            yield f"event: sql\ndata: {json.dumps(sql)}\n\n"

            try:
                with engine.connect() as conn:
                    result = conn.execute(text(sql))
                    cols = list(result.keys())
                    rows = [list(r) for r in result.fetchall()]
                payload = json.dumps({"columns": cols, "rows": rows})
                yield f"event: result\ndata: {payload}\n\n"
            except Exception as e:
                yield f"event: error\ndata: {json.dumps(str(e))}\n\n"
        except Exception as e:
            yield f"event: error\ndata: {json.dumps(str(e))}\n\n"
        finally:
            yield "event: done\ndata: {}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=PORT)
