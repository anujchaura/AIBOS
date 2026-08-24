"""
RAG Pipeline – Full end-to-end retrieval and generation pipeline
Supports: Google Gemini (direct, free), OpenRouter, OpenAI
"""
import os
import re
import time
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI

from .vector_store import search
from .embedder import embed_single

# ── LLM Clients ──────────────────────────────────────────────────────────────
_openrouter_client = None
_gemini_client = None


def get_openrouter_client():
    """Get OpenRouter/OpenAI client (paid, needs credits)"""
    global _openrouter_client
    if _openrouter_client is None:
        api_key = os.getenv("OPENAI_API_KEY", "")
        base_url = os.getenv("OPENAI_BASE_URL")
        if api_key.startswith("sk-or-v1-") and not base_url:
            base_url = "https://openrouter.ai/api/v1"
        kwargs = {"api_key": api_key}
        if base_url:
            kwargs["base_url"] = base_url
        _openrouter_client = AsyncOpenAI(**kwargs)
    return _openrouter_client


def get_gemini_client():
    """Get Google Gemini direct API client (FREE, 1500 req/day)"""
    global _gemini_client
    if _gemini_client is None:
        gemini_key = os.getenv("GEMINI_API_KEY", "")
        if gemini_key and gemini_key != "placeholder-add-your-gemini-key-here":
            _gemini_client = AsyncOpenAI(
                api_key=gemini_key,
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            )
    return _gemini_client


# ── Formatting Prompt ─────────────────────────────────────────────────────────
FORMAT_INSTRUCTIONS = """
## Response Format Rules:
1. **Structure**: Use markdown headings (##), bullet points, and bold for key metrics.
2. **Tables**: When presenting comparative data, always use markdown tables:
   | Metric | Value | Change |
   |--------|-------|--------|
3. **Numbers**: Always highlight key numbers in **bold** (e.g., **$18.4M**, **14.2%**).
4. **Citations**: Always cite sources as [Source 1], [Source 2], etc.
5. **Analysis**: After presenting data, add a brief "### Key Insights" section with 2-3 actionable points.
6. **Tone**: Professional, data-driven, and actionable. Never dump raw text.
"""


async def rag_query(
    question: str,
    org_id: str,
    agent_system_prompt: str = "",
    n_results: int = 5,
    conversation_history: List[Dict] = None,
    filter_dict: Dict = None,
) -> Dict[str, Any]:
    """
    Full RAG pipeline:
    1. Embed query → 2. Retrieve chunks → 3. Build prompt
    4. Generate via Gemini (free) or OpenRouter (paid) → 5. Return with citations
    """
    start_time = time.time()
    conversation_history = conversation_history or []
    max_tokens = int(os.getenv("MAX_TOKENS", "300"))

    # ── Step 1-2: Retrieve relevant context ──────────────────────────────────
    try:
        retrieved_chunks = await search(question, org_id, n_results=5, filter_dict=filter_dict)
    except Exception as e:
        print(f"[RAG] Vector search failed: {e}")
        retrieved_chunks = []

    # ── Step 3: Build rich context string ─────────────────────────────────────
    context_parts = []
    total_context_chars = 0
    max_context_chars = 3000
    for i, chunk in enumerate(retrieved_chunks):
        source = chunk["metadata"].get("source", "Unknown")
        page = chunk["metadata"].get("page", "")
        page_info = f" (Page {page})" if page else ""
        chunk_text = chunk["chunk"][:600]
        part = f"[Source {i+1}: {source}{page_info}]\n{chunk_text}"
        if total_context_chars + len(part) > max_context_chars:
            break
        context_parts.append(part)
        total_context_chars += len(part)
    context_str = "\n---\n".join(context_parts)

    # ── Step 4: Build messages ────────────────────────────────────────────────
    base_persona = agent_system_prompt or "You are an expert AI business assistant."

    system_prompt = f"""{base_persona}

{FORMAT_INSTRUCTIONS}

## Knowledge Base Context (Retrieved Documents):
{context_str if context_str else "No relevant documents found in the knowledge base. Answer based on your general expertise."}

## Instructions:
- Analyze the context thoroughly and provide a well-structured, professional response.
- When data contains tables, always reproduce them as proper markdown tables.
- Highlight key numbers, percentages, and metrics in **bold**.
- Always cite your sources with [Source N] references.
- End with actionable insights or recommendations when appropriate."""

    messages = [{"role": "system", "content": system_prompt}]
    for msg in conversation_history[-6:]:
        messages.append({"role": msg["role"], "content": msg["content"][:500]})
    messages.append({"role": "user", "content": question})

    # ── Step 5: LLM Generation (Gemini free → OpenRouter fallback) ────────────
    answer = None
    tokens_used = 0
    llm_model_used = "unknown"

    # Strategy 1: Try Google Gemini Direct API (FREE, no credits needed)
    gemini = get_gemini_client()
    if gemini:
        gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
        try:
            response = await gemini.chat.completions.create(
                model=gemini_model,
                messages=messages,
                temperature=0.3,
                max_tokens=max(max_tokens, 500),  # Gemini is free, use generous tokens
            )
            answer = response.choices[0].message.content
            tokens_used = response.usage.total_tokens if response.usage else 0
            llm_model_used = f"gemini/{gemini_model}"
            print(f"[RAG] Gemini direct API success (model={gemini_model})")
        except Exception as e:
            print(f"[RAG] Gemini direct failed: {str(e)[:150]}, falling back to OpenRouter")

    # Strategy 2: OpenRouter with auto-retry on credit errors
    if answer is None:
        openrouter = get_openrouter_client()
        llm_model = os.getenv("OPENAI_MODEL", "google/gemini-2.5-flash")
        current_max_tokens = max_tokens

        for attempt in range(4):
            try:
                response = await openrouter.chat.completions.create(
                    model=llm_model,
                    messages=messages,
                    temperature=0.3,
                    max_tokens=current_max_tokens,
                )
                answer = response.choices[0].message.content
                tokens_used = response.usage.total_tokens if response.usage else 0
                llm_model_used = llm_model
                break
            except Exception as e:
                error_msg = str(e)
                if "402" in error_msg and current_max_tokens > 20:
                    current_max_tokens = max(20, current_max_tokens // 2)
                    print(f"[RAG] Credit limit hit, retrying with max_tokens={current_max_tokens} (attempt {attempt+2})")
                    continue
                else:
                    print(f"[RAG] OpenRouter LLM call failed: {error_msg[:150]}")
                    break

    # Strategy 3: Graceful fallback with formatted raw context
    if answer is None:
        if context_str:
            answer = _format_raw_context_fallback(context_str, question)
        else:
            answer = "I apologize, but I'm unable to generate a response right now. Please check your API configuration or try again."

    processing_time_ms = round((time.time() - start_time) * 1000)

    # ── Step 6: Confidence & sources ──────────────────────────────────────────
    confidence = _estimate_confidence(retrieved_chunks, answer)

    sources = [
        {
            "docName": c["metadata"].get("source", "Unknown"),
            "docId": c["metadata"].get("document_id", ""),
            "chunk": c["chunk"][:300] + "..." if len(c["chunk"]) > 300 else c["chunk"],
            "score": round(c["score"], 3),
        }
        for c in retrieved_chunks
    ]

    return {
        "answer": answer,
        "confidence": confidence,
        "reasoning": f"Retrieved {len(retrieved_chunks)} relevant context chunks from knowledge base",
        "sources": sources,
        "context_chunks": retrieved_chunks,
        "llm_used": llm_model_used,
        "processing_time_ms": processing_time_ms,
        "tokens_used": tokens_used,
    }


def _format_raw_context_fallback(context_str: str, question: str) -> str:
    """Format raw context in a readable way when LLM is unavailable"""
    lines = context_str.split("\n")
    formatted = f"## Retrieved Data for: *{question}*\n\n"
    formatted += "> ⚠️ AI analysis is temporarily unavailable. Showing retrieved document data:\n\n"
    for line in lines[:30]:
        line = line.strip()
        if line.startswith("[Source"):
            formatted += f"\n### 📄 {line}\n"
        elif line == "---":
            formatted += "\n---\n"
        elif line:
            formatted += f"{line}\n"
    return formatted


def _estimate_confidence(chunks: List[Dict], answer: str) -> float:
    """Estimate response confidence based on context relevance scores"""
    if not chunks:
        return 0.3
    avg_score = sum(c["score"] for c in chunks) / len(chunks)
    if avg_score > 0.8:
        return min(0.95, avg_score)
    elif avg_score > 0.6:
        return 0.75
    elif avg_score > 0.4:
        return 0.55
    else:
        return 0.35
