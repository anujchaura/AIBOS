"""
MCP Router – FastAPI routes for MCP tool listing and execution
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, Optional

from mcp.tools import mcp_tools

router = APIRouter()


class ExecuteRequest(BaseModel):
    tool: str
    params: Dict[str, Any] = {}
    org_id: Optional[str] = None
    user_id: Optional[str] = None


@router.get("/tools")
async def list_tools():
    return {"tools": mcp_tools.get_tools_schema()}


@router.post("/execute")
async def execute_tool(request: ExecuteRequest):
    if not request.tool:
        raise HTTPException(status_code=400, detail="Tool name required")

    result = await mcp_tools.execute(
        tool=request.tool,
        params=request.params,
        org_id=request.org_id,
        user_id=request.user_id,
    )
    return {"tool": request.tool, "result": result}
