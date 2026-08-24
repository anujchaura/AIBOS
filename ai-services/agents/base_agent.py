"""
Base Agent – Abstract class for all specialized agents
"""
import os
import time
from abc import ABC, abstractmethod
from typing import List, Dict, Any

from rag.pipeline import rag_query


class BaseAgent(ABC):
    def __init__(self, agent_id: str, name: str, system_prompt: str):
        self.agent_id = agent_id
        self.name = name
        self.system_prompt = system_prompt
        self.llm_model = os.getenv("OPENAI_MODEL", "gpt-4o")

    async def respond(
        self,
        message: str,
        org_id: str,
        conversation_history: List[Dict] = None,
    ) -> Dict[str, Any]:
        """
        Core response method using RAG pipeline.
        All agents use the same pipeline but with different system prompts.
        """
        result = await rag_query(
            question=message,
            org_id=org_id,
            agent_system_prompt=self.system_prompt,
            n_results=5,
            conversation_history=conversation_history or [],
        )

        return {
            **result,
            "agent_used": self.agent_id,
            "agent_name": self.name,
        }
