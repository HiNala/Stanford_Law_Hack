"""Pydantic schemas for clauses."""

import uuid
from datetime import datetime

from pydantic import BaseModel


class ClauseResponse(BaseModel):
    """Schema for returning clause data."""
    id: uuid.UUID
    contract_id: uuid.UUID
    clause_index: int
    clause_text: str
    clause_type: str | None
    section_heading: str | None
    risk_score: float | None
    risk_level: str | None
    risk_category: str | None
    explanation: str | None
    suggestion: str | None
    start_char: int | None
    end_char: int | None
    metadata_: dict | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ClauseListResponse(BaseModel):
    """Schema for listing clauses of a contract."""
    clauses: list[ClauseResponse]
    total: int


class RiskDistribution(BaseModel):
    """Risk distribution across a contract."""
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0


class ContractAnalysisSummary(BaseModel):
    """High-level analysis summary for a contract."""
    contract_id: uuid.UUID
    overall_risk_score: float | None
    risk_level: str | None
    risk_distribution: RiskDistribution
    total_clauses: int
    top_risks: list[ClauseResponse]
