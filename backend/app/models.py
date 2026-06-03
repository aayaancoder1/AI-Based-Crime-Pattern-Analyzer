from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CreateDatasetRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    source: str | None = Field(default=None, max_length=255)


class DatasetResponse(BaseModel):
    id: UUID
    owner_id: UUID | None
    name: str
    source: str | None
    status: str
    record_count: int
    uploaded_at: datetime
    created_at: datetime


class IncidentUploadResponse(BaseModel):
    records_imported: int
    records_rejected: int


class IncidentResponse(BaseModel):
    id: UUID
    dataset_id: UUID
    crime_type: str
    latitude: float
    longitude: float
    incident_date: datetime
    district: str | None
    description: str | None
    created_at: datetime


class IncidentListResponse(BaseModel):
    incidents: list[IncidentResponse]
    total_count: int


class HotspotResponse(BaseModel):
    cluster_id: int
    incident_count: int
    center_latitude: float
    center_longitude: float


class HotspotListResponse(BaseModel):
    hotspots: list[HotspotResponse]


class AnalyticsSummaryResponse(BaseModel):
    total_incidents: int
    total_hotspots: int
    top_crime_type: str | None
    top_district: str | None


class CrimeTypeCountResponse(BaseModel):
    crime_type: str
    count: int


class DistrictCountResponse(BaseModel):
    district: str
    count: int


class RiskScoreResponse(BaseModel):
    district: str
    risk_score: int
    risk_level: str
    incident_count: int
    hotspot_count: int
