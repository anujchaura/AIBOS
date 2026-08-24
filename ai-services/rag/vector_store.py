"""
RAG Vector Store – ChromaDB integration (PersistentClient - no server required)
"""
import os
import asyncio
import chromadb
from typing import List, Dict, Any

from .embedder import generate_embeddings, embed_single

_chroma_client = None
_collections: Dict[str, any] = {}


def get_chroma_client():
    global _chroma_client
    if _chroma_client is None:
        # Use PersistentClient — stores data in a local directory, no server needed
        persist_dir = os.getenv("CHROMA_PERSIST_DIR", "./chroma_data")
        os.makedirs(persist_dir, exist_ok=True)
        _chroma_client = chromadb.PersistentClient(path=persist_dir)
        print(f"✅ ChromaDB PersistentClient initialized at: {persist_dir}")
    return _chroma_client



async def initialize_chroma():
    """Create default collection on startup"""
    client = get_chroma_client()
    collection_name = os.getenv("CHROMA_COLLECTION", "aibos_knowledge")
    try:
        client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )
    except Exception as e:
        print(f"ChromaDB init: {e}")


def get_collection(org_id: str) -> chromadb.Collection:
    """Get or create org-specific collection"""
    # Use org-specific collections for data isolation
    collection_name = f"aibos_{org_id}" if org_id else os.getenv("CHROMA_COLLECTION", "aibos_knowledge")
    collection_name = collection_name[:63].replace("-", "_")  # ChromaDB limits

    if collection_name not in _collections:
        client = get_chroma_client()
        _collections[collection_name] = client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )
    return _collections[collection_name]


async def store_chunks(chunks: List[Dict], org_id: str) -> List[str]:
    """Embed chunks and store in ChromaDB. Returns list of vector IDs."""
    if not chunks:
        return []

    collection = get_collection(org_id)
    texts = [c["text"] for c in chunks]

    # Generate embeddings
    embeddings = await generate_embeddings(texts)

    ids = [c["chunk_id"] for c in chunks]
    metadatas = [c["metadata"] for c in chunks]

    # Sanitize metadata (ChromaDB only accepts str, int, float, bool)
    sanitized_meta = []
    for m in metadatas:
        clean = {}
        for k, v in m.items():
            if isinstance(v, (str, int, float, bool)):
                clean[k] = v
            else:
                clean[k] = str(v)
        sanitized_meta.append(clean)

    # Store in ChromaDB
    collection.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=texts,
        metadatas=sanitized_meta,
    )

    return ids


async def search(
    query: str,
    org_id: str,
    n_results: int = 5,
    filter_dict: Dict = None,
) -> List[Dict[str, Any]]:
    """Semantic search in org's vector collection"""
    collection = get_collection(org_id)
    query_embedding = await embed_single(query)

    where = {}
    if filter_dict:
        where.update(filter_dict)

    kwargs = {
        "query_embeddings": [query_embedding],
        "n_results": min(n_results, collection.count() or 1),
        "include": ["documents", "metadatas", "distances"],
    }
    if where:
        kwargs["where"] = where

    results = collection.query(**kwargs)

    output = []
    for i, (doc, meta, distance) in enumerate(zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    )):
        output.append({
            "chunk": doc,
            "metadata": meta,
            "score": 1 - distance,  # Convert cosine distance to similarity
            "rank": i + 1,
        })

    return output


async def delete_document_chunks(document_id: str, org_id: str):
    """Remove all chunks for a document"""
    collection = get_collection(org_id)
    collection.delete(where={"document_id": document_id})
