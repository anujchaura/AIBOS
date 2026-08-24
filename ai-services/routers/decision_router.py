"""Decision Router"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from decision.engine import decision_engine

router = APIRouter()

class AnalyzeRequest(BaseModel):
    metric: str
    value: str
    context: str = ""
    period: str = "current month"
    org_id: Optional[str] = None


@router.get("/recommendations")
async def get_recommendations(org_id: Optional[str] = None):
    return await decision_engine.get_recommendations(org_id or "default")


@router.post("/analyze")
async def analyze_metric(request: AnalyzeRequest):
    return await decision_engine.analyze_metric(
        request.metric, request.value, request.context, request.period, request.org_id or "default"
    )
