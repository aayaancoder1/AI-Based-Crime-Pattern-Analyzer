from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.models import DatasetCreate, DatasetResponse
from app.supabase_client import get_supabase_client

router = APIRouter(prefix="/datasets", tags=["datasets"])


@router.post(
    "",
    response_model=DatasetResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_dataset(payload: DatasetCreate) -> DatasetResponse:
    response = (
        get_supabase_client()
        .table("datasets")
        .insert(payload.model_dump(mode="json"))
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Dataset could not be created.",
        )

    return DatasetResponse.model_validate(response.data[0])


@router.get("", response_model=list[DatasetResponse])
def list_datasets() -> list[DatasetResponse]:
    response = (
        get_supabase_client()
        .table("datasets")
        .select("id, owner_id, name, source, status, record_count, uploaded_at, created_at")
        .order("uploaded_at", desc=True)
        .execute()
    )

    return [DatasetResponse.model_validate(dataset) for dataset in response.data]


@router.get("/{dataset_id}", response_model=DatasetResponse)
def get_dataset(dataset_id: UUID) -> DatasetResponse:
    response = (
        get_supabase_client()
        .table("datasets")
        .select("id, owner_id, name, source, status, record_count, uploaded_at, created_at")
        .eq("id", str(dataset_id))
        .limit(1)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found.",
        )

    return DatasetResponse.model_validate(response.data[0])
