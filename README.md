# Flowbit Analytics Dashboard

Monorepo containing:
- apps/web: Next.js frontend (App Router, Tailwind, Recharts)
- apps/api: Express + Prisma REST API (PostgreSQL)
- services/vanna: FastAPI + Groq-powered SQL generation (Vanna-style)
- data/Analytics_Test_Data.json: seed dataset

Quick start
```bash
# 1) Install deps
npm install

# 2) Start Postgres (Docker)
docker compose up -d postgres

# 3) Configure envs
cp .env.example .env

# 4) Migrate + seed
npm run prisma:generate -w apps/api
npm run prisma:migrate -w apps/api
npm run db:seed -w apps/api

# 5) Run API + Web
npm run dev

# 6) Run Vanna service (in another shell)
python -m venv .venv && source .venv/bin/activate
pip install -r services/vanna/requirements.txt
uvicorn services/vanna/app.main:app --reload --port 8000
```

Deployment
- Frontend + API → Vercel (monorepo)
- Vanna service → Render/Fly.io/Docker host
- Managed Postgres → Neon/Supabase

