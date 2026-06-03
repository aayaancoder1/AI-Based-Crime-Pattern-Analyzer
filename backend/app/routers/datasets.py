from uuid import UUID

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.models import CreateDatasetRequest, DatasetResponse, IncidentUploadResponse
from app.repositories import datasets as dataset_repository

router = APIRouter(prefix="/datasets", tags=["datasets"])


@router.post(
    "",
    response_model=DatasetResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_dataset(payload: CreateDatasetRequest) -> DatasetResponse:
    try:
        dataset = dataset_repository.create_dataset(payload)
    except dataset_repository.DatasetRepositoryError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    return DatasetResponse.model_validate(dataset)


@router.get("", response_model=list[DatasetResponse])
def list_datasets() -> list[DatasetResponse]:
    try:
        datasets = dataset_repository.list_datasets()
    except dataset_repository.DatasetRepositoryError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    return [DatasetResponse.model_validate(dataset) for dataset in datasets]


@router.get("/{dataset_id}", response_model=DatasetResponse)
def get_dataset(dataset_id: UUID) -> DatasetResponse:
    try:
        dataset = dataset_repository.get_dataset(dataset_id)
    except dataset_repository.DatasetRepositoryError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    if dataset is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found.",
        )

    return DatasetResponse.model_validate(dataset)


@router.post("/{dataset_id}/upload", response_model=IncidentUploadResponse)
async def upload_dataset_incidents(
    dataset_id: UUID,
    file: UploadFile = File(...),
) -> IncidentUploadResponse:
    if file.content_type not in {"text/csv", "application/csv", "text/plain", None}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Upload must be a CSV file.",
        )

    try:
        dataset = dataset_repository.get_dataset(dataset_id)
    except dataset_repository.DatasetRepositoryError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    if dataset is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found.",
        )

    try:
        csv_bytes = await file.read()
        imported, rejected = dataset_repository.upload_incidents(dataset_id, csv_bytes)
    except dataset_repository.DatasetRepositoryError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return IncidentUploadResponse(
        records_imported=imported,
        records_rejected=rejected,
    )
