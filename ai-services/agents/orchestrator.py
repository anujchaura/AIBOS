"""
AI Orchestrator – Routes requests to the correct specialized agent
Uses keyword matching + LLM fallback for multi-agent coordination
"""
import os
import time
from typing import List, Dict, Any, Optional, Literal

from openai import AsyncOpenAI
from .base_agent import BaseAgent
from .ceo_agent import CEOAgent
from .finance_agent import FinanceAgent
from .hr_agent import HRAgent
from .sales_agent import SalesAgent
from .legal_agent import LegalAgent
from .research_agent import ResearchAgent
from .operations_agent import OperationsAgent

# Agent registry
AGENTS: Dict[str, BaseAgent] = {
    "ceo": CEOAgent(),
    "finance": FinanceAgent(),
    "hr": HRAgent(),
    "sales": SalesAgent(),
    "legal": LegalAgent(),
    "research": ResearchAgent(),
    "operations": OperationsAgent(),
}

AGENT_KEYWORDS = {
    "ceo": ["strategy", "vision", "leadership", "executive", "business plan", "company direction", "CEO", "board"],
    "finance": ["revenue", "expense", "budget", "profit", "loss", "cash flow", "invoice", "finance", "financial", "cost", "ROI", "margin"],
    "hr": ["employee", "hiring", "recruitment", "attendance", "leave", "policy", "HR", "workforce", "talent", "onboarding", "performance review"],
    "sales": ["sales", "lead", "customer", "CRM", "deal", "pipeline", "revenue forecast", "conversion", "quota", "prospect", "sale"],
    "legal": ["contract", "legal", "compliance", "risk", "clause", "regulation", "lawsuit", "IP", "NDA", "agreement"],
    "research": ["market", "competitor", "research", "trend", "analysis", "technology", "innovation", "benchmark", "study"],
    "operations": ["inventory", "supply chain", "vendor", "logistics", "warehouse", "production", "workflow", "process", "operations"],
}


class AIOrchestrator:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY", "")
        base_url = os.getenv("OPENAI_BASE_URL")
        if api_key.startswith("sk-or-v1-") and not base_url:
            base_url = "https://openrouter.ai/api/v1"
        kwargs = {"api_key": api_key}
        if base_url:
            kwargs["base_url"] = base_url
        self.client = AsyncOpenAI(**kwargs)
        self.model = os.getenv("OPENAI_MODEL", "openai/gpt-4o")
        self.max_tokens = int(os.getenv("MAX_TOKENS", "200"))


    async def route_and_respond(
        self,
        message: str,
        org_id: str,
        session_id: str,
        agent_type: str = "auto",
        conversation_history: List[Dict] = None,
        user_id: str = None,
    ) -> Dict[str, Any]:
        """
        Main orchestrator entry point.
        1. Classify intent → select agent
        2. Route to agent
        3. Return XAI-enriched response
        """
        start_time = time.time()
        conversation_history = conversation_history or []

        # Step 1: Select agent
        if agent_type != "auto" and agent_type in AGENTS:
            selected_agent_id = agent_type
            routing_reasoning = f"User explicitly selected {agent_type} agent"
        else:
            selected_agent_id, routing_reasoning = self._classify_intent_keywords(message)

        agent = AGENTS[selected_agent_id]

        # Step 2: Get primary response (no secondary agents to save tokens/credits)
        try:
            result = await agent.respond(
                message=message,
                org_id=org_id,
                conversation_history=conversation_history,
            )
        except Exception as e:
            print(f"[Orchestrator] Agent {selected_agent_id} failed: {e}")
            result = {
                "answer": f"I apologize, but I encountered an error processing your request. Error: {str(e)[:150]}. Please try again or check your API credits.",
                "confidence": 0.1,
                "reasoning": f"Agent {selected_agent_id} encountered an error",
                "sources": [],
                "llm_used": self.model,
                "tools_used": [],
            }

        processing_time_ms = round((time.time() - start_time) * 1000)

        return {
            **result,
            "agent_used": selected_agent_id,
            "routing_reasoning": routing_reasoning,
            "processing_time_ms": processing_time_ms,
            "session_id": session_id,
        }

    def _classify_intent_keywords(self, message: str) -> tuple:
        """Use keyword matching to classify which agent should handle the message"""
        message_lower = message.lower()
        scores = {}
        for agent_id, keywords in AGENT_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw.lower() in message_lower)
            scores[agent_id] = score

        max_score = max(scores.values())
        if max_score >= 1:
            best_agent = max(scores, key=scores.get)
            return best_agent, f"Keyword matching: detected {max_score} {best_agent} keywords"

        # Default to CEO for general business queries
        return "ceo", "Default routing: no specific domain keywords detected, routing to CEO agent"


# Singleton
orchestrator = AIOrchestrator()
