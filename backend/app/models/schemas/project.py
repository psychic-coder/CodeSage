from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    source_type: str
    source_url: str | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str | None
    source_type: str
    primary_language: str | None
    total_files: int
    total_nodes: int
    total_edges: int
    status: str
    created_at: datetime
    updated_at: datetime


class JobStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    job_type: str
    status: str
    progress: int
    current_step: str | None
    error_message: str | None
