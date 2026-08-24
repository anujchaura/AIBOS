"""
Agents Router – FastAPI routes for the Multi-Agent chat system
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import asyncio

from agents.orchestrator import orchestrator

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    sessionId: str
    agentType: str = "auto"
    orgId: Optional[str] = None
    userId: Optional[str] = None
    conversationHistory: List[Dict[str, str]] = []


class ChatResponse(BaseModel):
    answer: str
    confidence: float
    reasoning: str
    sources: List[Dict[str, Any]]
    agent_used: str
    llm_used: str
    processing_time_ms: int
    session_id: str
    tools_used: List[str] = []


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Main multi-agent chat endpoint"""
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    try:
        result = await orchestrator.route_and_respond(
            message=request.message,
            org_id=request.orgId or "default",
            session_id=request.sessionId,
            agent_type=request.agentType,
            conversation_history=request.conversationHistory,
            user_id=request.userId,
        )
        return ChatResponse(
            answer=result["answer"],
            confidence=result.get("confidence", 0.5),
            reasoning=result.get("reasoning", ""),
            sources=result.get("sources", []),
            agent_used=result.get("agent_used", "unknown"),
            llm_used=result.get("llm_used", "gpt-4o"),
            processing_time_ms=result.get("processing_time_ms", 0),
            session_id=request.sessionId,
            tools_used=result.get("tools_used", []),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")


@router.get("/agents")
async def list_agents():
    """List all available agents"""
    return {
        "agents": [
            {"id": "auto", "name": "AI Orchestrator", "description": "Auto-routes to best agent", "icon": "🤖"},
            {"id": "ceo", "name": "CEO Agent", "description": "Business strategy & executive decisions", "icon": "👔"},
            {"id": "finance", "name": "Finance Agent", "description": "Revenue, expenses, cash flow", "icon": "💰"},
            {"id": "hr", "name": "HR Agent", "description": "Employee analytics, hiring, policies", "icon": "👥"},
            {"id": "sales", "name": "Sales Agent", "description": "Lead scoring, revenue forecasting", "icon": "📈"},
            {"id": "legal", "name": "Legal Agent", "description": "Contract review, compliance", "icon": "⚖️"},
            {"id": "research", "name": "Research Agent", "description": "Market research, competitor analysis", "icon": "🔬"},
            {"id": "operations", "name": "Operations Agent", "description": "Inventory, supply chain, workflows", "icon": "⚙️"},
        ]
    }
