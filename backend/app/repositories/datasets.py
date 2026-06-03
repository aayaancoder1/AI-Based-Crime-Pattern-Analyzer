from uuid import UUID

from io import BytesIO

import pandas as pd
from postgrest.exceptions import APIError

from app.models import CreateDatasetRequest
from app.supabase_client import get_supabase_client

DATASET_COLUMNS = (
    "id, owner_id, name, source, status, record_count, uploaded_at, created_at"
)


class DatasetRepositoryError(Exception):
    pass


def create_dataset(payload: CreateDatasetRequest) -> dict:
    dataset = {
        "owner_id": None,
        "name": payload.name,
        "source": payload.source,
        "status": "created",
        "record_count": 0,
    }

    try:
        response = (
            get_supabase_client()
            .table("datasets")
            .insert(dataset)
            .execute()
        )
    except (APIError, RuntimeError, ValueError) as exc:
        raise DatasetRepositoryError("Dataset could not be created.") from exc

    if not response.data:
        raise DatasetRepositoryError("Dataset could not be created.")

    return response.data[0]


def list_datasets() -> list[dict]:
    try:
        response = (
            get_supabase_client()
            .table("datasets")
            .select(DATASET_COLUMNS)
            .order("uploaded_at", desc=True)
            .execute()
        )
    except (APIError, RuntimeError, ValueError) as exc:
        raise DatasetRepositoryError("Datasets could not be loaded.") from exc

    return response.data or []


def get_dataset(dataset_id: UUID) -> dict | None:
    try:
        response = (
            get_supabase_client()
            .table("datasets")
            .select(DATASET_COLUMNS)
            .eq("id", str(dataset_id))
            .limit(1)
            .execute()
        )
    except (APIError, RuntimeError, ValueError) as exc:
        raise DatasetRepositoryError("Dataset could not be loaded.") from exc

    if not response.data:
        return None

    return response.data[0]


def upload_incidents(dataset_id: UUID, csv_bytes: bytes) -> tuple[int, int]:
    try:
        dataframe = pd.read_csv(BytesIO(csv_bytes))
    except Exception as exc:
        raise DatasetRepositoryError("CSV file could not be read.") from exc

    required_columns = {"crime_type", "latitude", "longitude", "incident_date"}
    missing_columns = required_columns.difference(dataframe.columns)
    if missing_columns:
        raise DatasetRepositoryError(
            "CSV file is missing required columns: "
            + ", ".join(sorted(missing_columns))
        )

    imported_rows: list[dict] = []
    rejected_count = 0

    for _, row in dataframe.iterrows():
        try:
            crime_type = str(row["crime_type"]).strip()
            latitude = float(row["latitude"])
            longitude = float(row["longitude"])
            incident_date = pd.to_datetime(row["incident_date"], utc=True)
        except Exception:
            rejected_count += 1
            continue

        if not crime_type:
            rejected_count += 1
            continue

        district = row.get("district")
        description = row.get("description")

        imported_rows.append(
            {
                "dataset_id": str(dataset_id),
                "crime_type": crime_type,
                "latitude": latitude,
                "longitude": longitude,
                "incident_date": incident_date.isoformat(),
                "district": None if pd.isna(district) else str(district),
                "description": None if pd.isna(description) else str(description),
            }
        )

    if imported_rows:
        try:
            get_supabase_client().table("incidents").insert(imported_rows).execute()
        except (APIError, RuntimeError, ValueError) as exc:
            raise DatasetRepositoryError("Incidents could not be imported.") from exc

        current_dataset = get_dataset(dataset_id)
        current_count = int(current_dataset["record_count"]) if current_dataset else 0
        try:
            get_supabase_client().table("datasets").update(
                {"record_count": current_count + len(imported_rows)}
            ).eq("id", str(dataset_id)).execute()
        except (APIError, RuntimeError, ValueError) as exc:
            raise DatasetRepositoryError("Dataset record count could not be updated.") from exc

    return len(imported_rows), rejected_count
