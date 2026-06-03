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
