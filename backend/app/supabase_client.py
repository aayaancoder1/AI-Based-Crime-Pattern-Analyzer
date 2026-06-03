from functools import lru_cache

from supabase import Client, create_client

from app.config import settings


def get_supabase_headers() -> dict[str, str]:
    return {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
    }


def get_supabase_rest_url() -> str:
    return f"{settings.supabase_url.rstrip('/')}/rest/v1/"


@lru_cache
def get_supabase_client() -> Client:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError("Supabase environment variables are not configured.")

    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )
