import os
import re
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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
        col_str = ", ".join([f"{c['name']} {str(c.get('type'))}" for c in cols])
        lines.append(f"TABLE {table_name}: {col_str}")
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
        "Only output the SQL inside a code block. Avoid DDL or writes. Use column names exactly as in the schema."
    )

    user_prompt = f"""
Database Schema:\n{schema}\n\nQuestion: {req.question}\n\nReturn only SQL in a single code block.
"""

    if Groq is None:
        raise HTTPException(status_code=500, detail="groq python package not installed")

    client = Groq(api_key=GROQ_API_KEY)
    completion = client.chat.completions.create(
        model="llama-3.1-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.1,
    )

    content = completion.choices[0].message.content or ""
    sql = limit_sql(extract_sql(content))

    # Execute SQL
    try:
        with engine.connect() as conn:
            result = conn.execute(text(sql))
            cols = list(result.keys())
            rows = [list(r) for r in result.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=400, detail={"sql": sql, "error": str(e)})

    return {"sql": sql, "columns": cols, "rows": rows}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=PORT)
