# CrimeLens Backend

FastAPI backend scaffold for CrimeLens.

## Run Locally

```powershell
Copy-Item .env.example .env
uv sync
uv run fastapi dev app/main.py
```

Edit `.env` before using the database health check:

```text
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only and must not be exposed to frontend code.

Health check:

```text
GET http://localhost:8000/health
```

Supabase connectivity check:

```text
GET http://localhost:8000/health/db
```

## Dataset Metadata Endpoints

These endpoints create and read dataset records only. CSV parsing, authentication,
and ML are not implemented yet.

```text
POST /datasets
GET /datasets
GET /datasets/{dataset_id}
```

Example create body:

```json
{
  "owner_id": "00000000-0000-0000-0000-000000000000",
  "name": "Sample crime dataset",
  "source": "manual",
  "status": "created",
  "record_count": 0
}
```

## Current Scope

Implemented:

- FastAPI app.
- Health check endpoint.
- Supabase configuration module.
- Reusable Supabase client module.
- Supabase connectivity health endpoint.
- Dataset metadata endpoints.
- CORS settings for local frontend development.

Not implemented:

- Authentication.
- Dataset upload.
- Supabase client.
- ML or analysis logic.
