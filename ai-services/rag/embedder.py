"""
RAG Embedder – generates vector embeddings for text chunks with reliable local fallback
"""
import os
import hashlib
from typing import List
from openai import AsyncOpenAI

_client = None

def get_openai_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        api_key = os.getenv("OPENAI_API_KEY", "")
        base_url = os.getenv("OPENAI_BASE_URL", "")
        if api_key.startswith("sk-or-v1-") and not base_url:
            base_url = "https://openrouter.ai/api/v1"

        kwargs = {"api_key": api_key}
        if base_url:
            kwargs["base_url"] = base_url

        _client = AsyncOpenAI(**kwargs)
    return _client


def generate_local_embedding(text: str, dim: int = 1536) -> List[float]:
    """Fallback deterministic vector generator when external embedding API fails"""
    vec = [0.0] * dim
    words = text.lower().split()
    for word in words:
        idx = int(hashlib.md5(word.encode()).hexdigest(), 16) % dim
        vec[idx] += 1.0
    norm = sum(x * x for x in vec) ** 0.5
    if norm > 0:
        vec = [x / norm for x in vec]
    return vec


async def generate_embeddings(texts: List[str], model: str = None) -> List[List[float]]:
    """
    Generate embeddings for a list of texts.
    Uses OpenAI text-embedding-3-small or OpenRouter, with deterministic local fallback.
    """
    model = model or os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")

    try:
        client = get_openai_client()
        all_embeddings = []
        batch_size = 100
        for i in range(0, len(texts), batch_size):
            batch = texts[i: i + batch_size]
            batch = [t.replace("\n", " ").strip() or " " for t in batch]
            response = await client.embeddings.create(model=model, input=batch)
            all_embeddings.extend([item.embedding for item in response.data])
        return all_embeddings
    except Exception as e:
        print(f"⚠️ External embedding API note ({e}), using local vector fallback")
        return [generate_local_embedding(t) for t in texts]


async def embed_single(text: str) -> List[float]:
    """Embed a single text string"""
    results = await generate_embeddings([text])
    return results[0]
