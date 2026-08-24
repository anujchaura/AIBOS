"""
RAG Chunker – splits text into semantic chunks for embedding
"""
from typing import List, Dict, Any
from langchain_text_splitters import RecursiveCharacterTextSplitter
import hashlib


def chunk_text(
    text: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
    metadata: Dict[str, Any] = None,
) -> List[Dict[str, Any]]:
    """
    Split text into overlapping chunks with metadata.
    Returns list of {text, metadata, chunk_id} dicts.
    """
    metadata = metadata or {}

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    raw_chunks = splitter.split_text(text)

    chunks = []
    for i, chunk_text in enumerate(raw_chunks):
        if not chunk_text.strip():
            continue

        # Deterministic chunk ID
        chunk_hash = hashlib.md5(f"{metadata.get('document_id', '')}_{i}_{chunk_text[:50]}".encode()).hexdigest()[:12]

        chunks.append({
            "chunk_id": chunk_hash,
            "text": chunk_text.strip(),
            "metadata": {
                **metadata,
                "chunk_index": i,
                "chunk_total": len(raw_chunks),
                "char_count": len(chunk_text),
                "word_count": len(chunk_text.split()),
            },
        })

    return chunks
