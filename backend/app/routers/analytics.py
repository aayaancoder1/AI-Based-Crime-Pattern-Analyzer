from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.models import (
    AnalyticsSummaryResponse,
    CrimeTypeCountResponse,
    DistrictCountResponse,
    InsightResponse,
    RiskScoreResponse,
)
from app.repositories.analytics import (
    AnalyticsRepositoryError,
    get_crime_type_counts,
    get_district_counts,
    get_insights,
    get_summary,
    get_risk_scores,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary/{dataset_id}", response_model=AnalyticsSummaryResponse)
def analytics_summary(dataset_id: UUID) -> AnalyticsSummaryResponse:
    try:
        summary = get_summary(dataset_id)
    except AnalyticsRepositoryError as exc:
        message = str(exc)
        if message == "Dataset not found.":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message) from exc
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=message) from exc

    return AnalyticsSummaryResponse.model_validate(summary)


@router.get("/crime-types/{dataset_id}", response_model=list[CrimeTypeCountResponse])
def analytics_crime_types(dataset_id: UUID) -> list[CrimeTypeCountResponse]:
    try:
        counts = get_crime_type_counts(dataset_id)
    except AnalyticsRepositoryError as exc:
        message = str(exc)
        if message == "Dataset not found.":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message) from exc
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=message) from exc

    return [CrimeTypeCountResponse.model_validate(item) for item in counts]


@router.get("/districts/{dataset_id}", response_model=list[DistrictCountResponse])
def analytics_districts(dataset_id: UUID) -> list[DistrictCountResponse]:
    try:
        counts = get_district_counts(dataset_id)
    except AnalyticsRepositoryError as exc:
        message = str(exc)
        if message == "Dataset not found.":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message) from exc
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=message) from exc

    return [DistrictCountResponse.model_validate(item) for item in counts]


@router.get("/risk-scores/{dataset_id}", response_model=list[RiskScoreResponse])
def analytics_risk_scores(dataset_id: UUID) -> list[RiskScoreResponse]:
    try:
        scores = get_risk_scores(dataset_id)
    except AnalyticsRepositoryError as exc:
        message = str(exc)
        if message == "Dataset not found.":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message) from exc
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=message) from exc

    return [RiskScoreResponse.model_validate(item) for item in scores]


@router.get("/insights/{dataset_id}", response_model=InsightResponse)
def analytics_insights(dataset_id: UUID) -> InsightResponse:
    try:
        insights = get_insights(dataset_id)
    except AnalyticsRepositoryError as exc:
        message = str(exc)
        if message == "Dataset not found.":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message) from exc
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=message) from exc

    return InsightResponse.model_validate(insights)
