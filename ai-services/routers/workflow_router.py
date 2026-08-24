"""
Workflow Router & Decision Router – FastAPI routes
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional, List

from workflow.engine import workflow_engine

router = APIRouter()


class WorkflowRunRequest(BaseModel):
    workflowId: str
    workflow: Dict[str, Any]
    triggerData: Dict[str, Any] = {}
    orgId: str
    userId: Optional[str] = None


@router.post("/run")
async def run_workflow(request: WorkflowRunRequest):
    result = await workflow_engine.execute(
        workflow_id=request.workflowId,
        workflow_def=request.workflow,
        trigger_data=request.triggerData,
        org_id=request.orgId,
        user_id=request.userId or "",
    )
    return result


@router.get("/health")
async def workflow_health():
    return {"status": "ok", "engine": "celery"}
