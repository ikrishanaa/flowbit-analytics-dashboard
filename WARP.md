# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Common commands

Bootstrap
- Install deps: `npm install`
- Set envs (root): `cp .env.example .env`
- Set envs (API package, used by dotenv): `cp apps/api/.env.example apps/api/.env`

Database (Docker Postgres)
- Start DB: `docker compose up -d postgres`
- Stop DB: `docker compose stop postgres`
- Reset DB: `docker compose down postgres && docker compose up -d postgres`

Prisma (API)
- Generate client: `npm run prisma:generate -w apps/api`
- Create/migrate dev DB: `npm run prisma:migrate -w apps/api`
- Seed sample data: `npm run db:seed -w apps/api`
- View Prisma Studio (DB GUI): `npx prisma studio --schema apps/api/prisma/schema.prisma`
- Reset DB completely: `npx prisma migrate reset -w apps/api`

Dev servers
- Run web+api together (Turbo): `npm run dev`
- Run only API: `npm run dev -w apps/api`
- Run only Web: `npm run dev -w apps/web`

Vanna (Python FastAPI for NL→SQL)
- Provide your key to Docker Compose session: `export GROQ_API_KEY={{GROQ_API_KEY}}`
- Start only Vanna: `docker compose up -d vanna`
- Tail logs: `docker compose logs -f --tail=100 vanna`
- Restart after code changes: `docker compose restart vanna`

Lint and format
- Monorepo lint: `npm run lint`
- Per package: `npm run lint -w apps/api` or `npm run lint -w apps/web`
- Format all code: `npm run format`

Build / prod
- Monorepo build: `npm run build`
- API build+start: `npm run build -w apps/api && npm run start -w apps/api`
- Web build+start: `npm run build -w apps/web && npm run start -w apps/web`

Health checks
- API: `curl http://localhost:4000/health`
- Vanna: `curl http://localhost:8000/health`
- Web: `curl http://localhost:3000` (should return HTML)

Tests
- No test runner is configured in this repo at present.

## High‑level architecture

Overview
- Monorepo managed by Turbo (`turbo.json`) with npm workspaces in `apps/*` and `services/*`.
- Postgres is the single database, run via Docker Compose.
- Data model lives in Prisma (TypeScript) and is also accessed by Python (SQLAlchemy) for the Vanna service.
- Uses CommonJS for API (not ES modules) — see `apps/api/tsconfig.json` and `apps/api/package.json`.
- Web uses Next.js 16 with React 19 and the React Compiler enabled.

Packages and responsibilities
- apps/web (Next.js App Router)
  - UI for the analytics dashboard and a "Chat with Data" page.
  - Uses `src/lib/api.ts` to call the API (base URL from `NEXT_PUBLIC_API_BASE`, defaults to `http://localhost:4000`).
  - Key pages: `src/app/dashboard/page.tsx` (charts via Recharts), `src/app/chat/page.tsx` (posts to `/chat-with-data`).
- apps/api (Express + Prisma)
  - Entry: `src/index.ts` wires CORS, logging, and routers.
  - Data access via `src/lib/prisma.ts` and Prisma Client.
  - Endpoints:
    - `GET /health` – DB liveness
    - `GET /stats` – totals and averages for dashboard cards
    - `GET /invoice-trends` – monthly invoice count and spend (raw SQL via `$queryRaw`)
    - `GET /vendors/top10` – top vendors by spend
    - `GET /category-spend` – spend by line-item category
    - `GET /cash-outflow` – per‑day forecast of upcoming outflow (uses generate_series)
    - `GET /invoices` – paginated, searchable invoices (vendor/customer join)
    - `POST /chat-with-data` – proxy to Vanna’s `/chat` (requires `VANNA_API_BASE_URL`)
  - Schema: `prisma/schema.prisma` defines `Document`, `Vendor`, `Customer`, `Invoice`, `LineItem`, `Payment`.
  - Seed script: `prisma/seed.ts` loads `data/Analytics_Test_Data.json` and upserts related rows.
- services/vanna (FastAPI + Groq)
  - Entry: `app/main.py`. Exposes:
    - `GET /health`
    - `POST /chat` → accepts `{ question }`, builds DB schema snapshot, asks Groq to generate SQL, post‑processes SQL (adds `LIMIT 200` if missing), executes it, returns `{ sql, columns, rows }`.
  - Requires `GROQ_API_KEY`. Database URL is taken from `VANNA__DATABASE_URL` (SQLAlchemy‑style) or `DATABASE_URL`.

Runtime flow
- Dashboard data
  - Web → API REST endpoints → Prisma → Postgres.
- Chat with data
  - Web → API `POST /chat-with-data` → Vanna `POST /chat` → Groq LLM generates SQL → Vanna executes SQL on Postgres → API returns results to Web.

Environments and ports
- Web (Next.js): 3000
- API (Express): 4000
- Vanna (FastAPI): 8000
- Postgres (Docker): 5432

Environment variables (most important)
- apps/web: `NEXT_PUBLIC_API_BASE` (defaults to `http://localhost:4000`).
- apps/api (dotenv): `DATABASE_URL`, `PORT` (default 4000), `VANNA_API_BASE_URL` (e.g. `http://localhost:8000`), `CORS_ORIGIN`.
- services/vanna: `GROQ_API_KEY` (required), `VANNA__DATABASE_URL` (e.g. `postgresql+psycopg://flowbit:flowbit@localhost:5432/flowbit`), `CORS_ORIGIN`.

Docker Compose
- File: `docker-compose.yml` defines `postgres` and `vanna` services.
- `vanna` service reads `GROQ_API_KEY` from your shell and uses a SQLAlchemy DSN to reach Postgres.
- If Compose warns that the `version` key is obsolete, you can remove the top‑level `version:` line.

Data seeding
- Seed data comes from `data/Analytics_Test_Data.json` containing invoice/vendor/customer/line-item records.
- Seed script (`apps/api/prisma/seed.ts`) upserts records to avoid duplicates on repeated runs.
- After schema changes, regenerate Prisma client, run migrations, then re-seed.

Gotchas
- The API loads envs via `dotenv/config` from the package's working directory. Ensure `apps/api/.env` exists (or set vars in the shell/CI) — the root `.env` is not automatically read by the API process.
- Web defaults `NEXT_PUBLIC_API_BASE` to `http://localhost:4000`, so it will work without a web‑specific `.env` in dev.
- Vanna service requires `GROQ_API_KEY` to be set in environment before starting Docker Compose.
- When making Prisma schema changes, always: (1) edit schema.prisma, (2) run `prisma:generate`, (3) run `prisma:migrate`, (4) restart API server.
