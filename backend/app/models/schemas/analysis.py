from pydantic import BaseModel
from typing import Any


class ImpactRequest(BaseModel):
    project_id: str
    feature_description: str


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