from typing import Any

from pydantic import BaseModel


class ImpactRequest(BaseModel):
    project_id: str
    feature_description: str
    session_id: str | None = None
    conversation_history: list[dict] | None = None


class PropagationRequest(BaseModel):
    project_id: str
    file_path: str
    change_type: str = "modify"


class OnboardingRequest(BaseModel):
    project_id: str
    topic: str


class QueryRequest(BaseModel):
    project_id: str
    query: str


class AnalysisResponse(BaseModel):
    data: Any
    cached: bool = False
