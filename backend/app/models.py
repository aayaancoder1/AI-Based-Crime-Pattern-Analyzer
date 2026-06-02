from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class DatasetCreate(BaseModel):
    owner_id: UUID
    name: str = Field(min_length=1, max_length=255)
    source: str | None = Field(default=None, max_length=255)
    status: str = Field(default="created", max_length=50)
    record_count: int = Field(default=0, ge=0)


class DatasetResponse(BaseModel):
    id: UUID
    owner_id: UUID
    name: str
    source: str | None
    status: str
    record_count: int
    uploaded_at: datetime
    created_at: datetime
