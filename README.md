# CrimeLens

CrimeLens is an AI-assisted crime pattern analysis project for exploring historical crime datasets, geospatial hotspots, and explainable risk scoring.

This repository currently contains the initial runnable project structure only. Business logic, ML, authentication, dataset upload, and Supabase integration are intentionally not implemented yet.

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

Install `uv`, then run:

```powershell
cd backend
uv sync
uv run fastapi dev app/main.py
```

The backend runs at `http://localhost:8000`.

Health check:

```text
GET http://localhost:8000/health
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
- Basic React homepage.
- Supabase schema migrations and seed data.

Not implemented yet:

- Dataset upload.
- Authentication.
- API business endpoints.
- Machine learning.
- Report generation.
