# CrimeLens

CrimeLens is an AI-assisted crime pattern analysis project for exploring historical crime datasets, geospatial hotspots, and explainable risk scoring.

This repository currently contains the initial runnable project structure and backend Supabase connectivity only. Business logic, ML, authentication, and dataset upload are intentionally not implemented yet.

## Project Structure

```text
frontend/   React + TypeScript + Vite + Tailwind CSS
backend/    FastAPI + Python managed with uv
docs/       Product, architecture, task, and schema documentation
supabase/   Database migrations and seed data
```

## Frontend

```powershell
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

## Backend

Install `uv`, configure environment variables, then run:

```powershell
cd backend
Copy-Item .env.example .env
uv sync
uv run fastapi dev app/main.py
```

Edit `backend/.env` with your Supabase values:

```text
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. Do not expose it in frontend code.

The backend runs at `http://localhost:8000`.

Health check:

```text
GET http://localhost:8000/health
```

Supabase connectivity check:

```text
GET http://localhost:8000/health/db
```

## Environment Files

Copy the examples before local development:

```powershell
Copy-Item frontend/.env.example frontend/.env
Copy-Item backend/.env.example backend/.env
```

## Current Scope

Implemented:

- Initial frontend scaffold.
- Initial backend scaffold.
- Basic backend health check.
- Backend Supabase configuration.
- Reusable backend Supabase client module.
- Supabase connectivity health check.
- Basic React homepage.
- Supabase schema migrations and seed data.

Not implemented yet:

- Dataset upload.
- Authentication.
- API business endpoints.
- Machine learning.
- Report generation.
