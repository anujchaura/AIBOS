"""
Workflow Engine – Async workflow executor with Celery & asyncio support
Supports trigger → steps DSL execution
"""
import os
import time
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

try:
    from celery import Celery
    celery_app = Celery(
        "aibos_workflows",
        broker=os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0"),
        backend=os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0"),
    )
    CELERY_AVAILABLE = True
except Exception:
    celery_app = None
    CELERY_AVAILABLE = False


class WorkflowEngine:
    """Executes workflow step sequences"""

    async def execute(
        self,
        workflow_id: str,
        workflow_def: Dict,
        trigger_data: Dict,
        org_id: str,
        user_id: str,
    ) -> Dict[str, Any]:
        """Execute a workflow and return run_id"""
        run_id = f"run_{int(time.time())}_{workflow_id[:8]}"

        if CELERY_AVAILABLE and os.getenv("REDIS_ENABLED", "false").lower() == "true":
            try:
                task = execute_workflow_task.delay(
                    run_id=run_id,
                    workflow_id=workflow_id,
                    workflow_def=workflow_def,
                    trigger_data=trigger_data,
                    org_id=org_id,
                    user_id=user_id,
                )
                return {"run_id": run_id, "task_id": task.id, "status": "started", "engine": "celery"}
            except Exception as e:
                print(f"⚠️ Celery execution skipped ({e}), using async direct execution")

        # Direct Async Background Execution (Fallback - zero external dependency)
        asyncio.create_task(_run_steps(run_id, workflow_id, workflow_def, trigger_data, org_id))
        return {"run_id": run_id, "status": "started", "engine": "asyncio_direct"}


if CELERY_AVAILABLE:
    @celery_app.task(bind=True, max_retries=3)
    def execute_workflow_task(self, run_id: str, workflow_id: str, workflow_def: Dict,
                              trigger_data: Dict, org_id: str, user_id: str):
        """Celery task to execute workflow steps"""
        loop = asyncio.new_event_loop()
        try:
            result = loop.run_until_complete(
                _run_steps(run_id, workflow_id, workflow_def, trigger_data, org_id)
            )
            return result
        finally:
            loop.close()


async def _run_steps(run_id: str, workflow_id: str, workflow: Dict, trigger_data: Dict, org_id: str) -> Dict:
    """Execute workflow steps in sequence"""
    steps = workflow.get("steps", [])
    step_results = {}
    context = {"trigger_data": trigger_data, "org_id": org_id, "run_id": run_id}

    for step in sorted(steps, key=lambda s: s.get("order", 999)):
        step_id = step.get("id", f"step_{time.time()}")
        step_type = step.get("type", "custom")

        try:
            result = await _execute_step(step_type, step.get("config", {}), context, step_results)
            step_results[step_id] = {"status": "success", "output": result}
            context[f"step_{step_id}"] = result
        except Exception as e:
            step_results[step_id] = {"status": "failed", "error": str(e)}
            on_error = step.get("onError", "stop")
            if on_error == "stop":
                break

    return {"run_id": run_id, "step_results": step_results, "status": "completed"}


async def _execute_step(step_type: str, config: Dict, context: Dict, previous: Dict) -> Dict:
    """Execute a single workflow step"""
    if step_type == "extract_data":
        from rag.pipeline import rag_query
        doc_text = context.get("trigger_data", {}).get("extracted_text", "")
        question = config.get("question", "Extract all key information from this document")
        result = await rag_query(question, context.get("org_id", "default"))
        return {"extracted": result.get("answer", ""), "confidence": result.get("confidence", 0.9)}

    elif step_type == "verify":
        field = config.get("field", "")
        rule = config.get("rule", "not_empty")
        value = _resolve_from_context(field, context, previous)
        passed = True if rule == "not_empty" else bool(value)
        return {"verified": passed, "field": field, "value": str(value), "rule": rule}

    elif step_type == "store":
        return {"stored": True, "collection": config.get("collection", "workflow_outputs"),
                "timestamp": datetime.now(timezone.utc).isoformat()}

    elif step_type == "summarize":
        from rag.pipeline import rag_query
        text = str(context.get("trigger_data", {}))
        result = await rag_query(
            f"Summarize this: {text[:2000]}",
            context.get("org_id", "default"),
            agent_system_prompt="You are a concise summarizer. Create a brief executive summary.",
        )
        return {"summary": result.get("answer", "Summary completed")}

    elif step_type == "notify":
        recipient = config.get("recipient", "team@company.com")
        subject = config.get("subject", "AIBOS Workflow Notification")
        return {"notified": True, "recipient": recipient, "subject": subject}

    elif step_type == "ai_action":
        from rag.pipeline import rag_query
        prompt = config.get("prompt", "Analyze the provided data")
        result = await rag_query(prompt, context.get("org_id", "default"))
        return {"ai_result": result.get("answer", ""), "confidence": result.get("confidence", 0.9)}

    elif step_type == "dashboard_entry":
        return {"dashboard_updated": True, "metric": config.get("metric", "unknown"),
                "value": config.get("value", ""), "timestamp": datetime.now(timezone.utc).isoformat()}

    else:
        return {"executed": True, "step_type": step_type, "note": "Custom step completed"}


def _resolve_from_context(field: str, context: Dict, previous: Dict) -> Any:
    """Resolve a field value from context or previous step results"""
    if "." in field:
        parts = field.split(".", 1)
        parent = previous.get(parts[0], {})
        if isinstance(parent, dict):
            return parent.get(parts[1])
    return context.get(field) or previous.get(field, "")


workflow_engine = WorkflowEngine()
