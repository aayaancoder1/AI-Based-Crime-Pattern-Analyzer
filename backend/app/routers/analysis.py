from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.models import HotspotListResponse, HotspotResponse
from app.repositories.analysis import AnalysisRepositoryError, detect_hotspots

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.post(
    "/hotspots/{dataset_id}",
    response_model=HotspotListResponse,
)
def detect_dataset_hotspots(dataset_id: UUID) -> HotspotListResponse:
    """Detect hotspot clusters for a dataset using DBSCAN."""
    try:
        hotspots = detect_hotspots(dataset_id)
    except AnalysisRepositoryError as exc:
        message = str(exc)
        if message == "Dataset not found.":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=message,
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=message,
        ) from exc

    return HotspotListResponse(
        hotspots=[HotspotResponse.model_validate(hotspot) for hotspot in hotspots],
    )
