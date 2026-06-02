# CrimeLens Backend

FastAPI backend scaffold for CrimeLens.

## Run Locally

```powershell
uv sync
uv run fastapi dev app/main.py
```

Health check:

```text
GET http://localhost:8000/health
```

## Current Scope

Implemented:

- FastAPI app.
- Health check endpoint.
- CORS settings for local frontend development.

Not implemented:

- Authentication.
- Dataset upload.
- Supabase client.
- ML or analysis logic.
