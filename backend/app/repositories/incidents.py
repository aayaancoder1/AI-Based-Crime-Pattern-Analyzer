from uuid import UUID

import logging

from postgrest.exceptions import APIError

from app.supabase_client import get_supabase_client

INCIDENT_COLUMNS = (
    "id, dataset_id, crime_type, latitude, longitude, "
    "incident_date, district, description, created_at"
)


class IncidentRepositoryError(Exception):
    pass


logger = logging.getLogger(__name__)


def list_incidents(dataset_id: UUID, limit: int, offset: int) -> tuple[list[dict], int]:
    try:
        response = (
            get_supabase_client()
            .table("incidents")
            .select(INCIDENT_COLUMNS, count="exact")
            .eq("dataset_id", str(dataset_id))
            .order("incident_date", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
    except (APIError, RuntimeError, ValueError) as exc:
        logger.exception("Failed to load incidents for dataset %s", dataset_id)
        raise IncidentRepositoryError("Incidents could not be loaded.") from exc

    incidents = []
    for incident in response.data or []:
        incidents.append(
            {
                "id": incident["id"],
                "dataset_id": incident["dataset_id"],
                "crime_type": incident["crime_type"],
                "latitude": incident["latitude"],
                "longitude": incident["longitude"],
                "incident_date": incident["incident_date"],
                "district": incident.get("district"),
                "description": incident.get("description"),
                "created_at": incident["created_at"],
            }
        )

    return incidents, int(response.count or 0)


def get_incident(incident_id: UUID) -> dict | None:
    try:
        response = (
            get_supabase_client()
            .table("incidents")
            .select(INCIDENT_COLUMNS)
            .eq("id", str(incident_id))
            .limit(1)
            .execute()
        )
    except (APIError, RuntimeError, ValueError) as exc:
        logger.exception("Failed to load incident %s", incident_id)
        raise IncidentRepositoryError("Incident could not be loaded.") from exc

    if not response.data:
        return None

    incident = response.data[0]
    return {
        "id": incident["id"],
        "dataset_id": incident["dataset_id"],
        "crime_type": incident["crime_type"],
        "latitude": incident["latitude"],
        "longitude": incident["longitude"],
        "incident_date": incident["incident_date"],
        "district": incident.get("district"),
        "description": incident.get("description"),
        "created_at": incident["created_at"],
    }
