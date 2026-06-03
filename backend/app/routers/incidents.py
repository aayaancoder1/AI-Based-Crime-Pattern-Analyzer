from uuid import UUID

import logging

from fastapi import APIRouter, HTTPException, Query, status

from app.models import IncidentListResponse, IncidentResponse
from app.repositories import datasets as dataset_repository
from app.repositories import incidents as incident_repository

router = APIRouter(prefix="/incidents", tags=["incidents"])
logger = logging.getLogger(__name__)


@router.get("", response_model=IncidentListResponse)
def list_incidents(
    dataset_id: UUID = Query(..., description="Dataset identifier"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
) -> IncidentListResponse:
    """List incidents for a dataset with pagination."""
    try:
        dataset = dataset_repository.get_dataset(dataset_id)
    except dataset_repository.DatasetRepositoryError as exc:
        logger.exception("Failed to load dataset %s for incident listing", dataset_id)
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
        incidents, total_count = incident_repository.list_incidents(
            dataset_id=dataset_id,
            limit=limit,
            offset=offset,
        )
    except incident_repository.IncidentRepositoryError as exc:
        logger.exception("Failed to list incidents for dataset %s", dataset_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    return IncidentListResponse(
        incidents=[IncidentResponse.model_validate(incident) for incident in incidents],
        total_count=total_count,
    )


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(incident_id: UUID) -> IncidentResponse:
    """Return a single incident by ID."""
    try:
        incident = incident_repository.get_incident(incident_id)
    except incident_repository.IncidentRepositoryError as exc:
        logger.exception("Failed to load incident %s", incident_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    if incident is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found.",
        )

    return IncidentResponse.model_validate(incident)
