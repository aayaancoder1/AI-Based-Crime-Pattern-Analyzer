import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routers.datasets import router as datasets_router
from app.supabase_client import get_supabase_headers, get_supabase_rest_url

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(datasets_router)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/db", response_model=None)
async def database_health_check():
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "database": "disconnected"},
        )

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                get_supabase_rest_url(),
                headers=get_supabase_headers(),
            )
            response.raise_for_status()
    except httpx.HTTPError:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "database": "disconnected"},
        )

    return {"status": "ok", "database": "connected"}
