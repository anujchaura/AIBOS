"""
RAG Router – FastAPI routes for document ingestion and RAG pipeline
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, Dict, Any
import asyncio

from rag.document_processor import DocumentProcessor
from rag.vector_store import search, delete_document_chunks
from rag.pipeline import rag_query

router = APIRouter()
processor = DocumentProcessor()


class ProcessRequest(BaseModel):
    documentId: str
    filePath: str
    fileType: str
    orgId: str
    metadata: Dict[str, Any] = {}


class ProcessURLRequest(BaseModel):
    documentId: str
    url: str
    orgId: str


class QueryRequest(BaseModel):
    question: str
    orgId: str
    nResults: int = 5
    filters: Optional[Dict] = None


async def _update_doc_status(doc_id: str, result: dict, org_id: str):
    """Update document status in MongoDB after processing"""
    try:
        import os
        import motor.motor_asyncio as motor
        client = motor.AsyncIOMotorClient(os.getenv("MONGODB_URI", "mongodb://localhost:27017/aibos"))
        db = client[os.getenv("MONGODB_DB_NAME", "aibos")]
        from bson import ObjectId
        update = {
            "status": "completed" if result["success"] else "failed",
            "chunkCount": result.get("chunk_count", 0),
            "vectorIds": result.get("vector_ids", []),
            "wordCount": result.get("word_count", 0),
            "processingError": result.get("error"),
            "processingCompleted": __import__("datetime").datetime.utcnow(),
        }
        await db.documents.update_one({"_id": ObjectId(doc_id)}, {"$set": update})
        client.close()
    except Exception as e:
        print(f"DB update error: {e}")


@router.post("/process")
async def process_document(request: ProcessRequest, background_tasks: BackgroundTasks):
    """Trigger async document processing"""
    background_tasks.add_task(_process_and_update, request)
    return {"message": "Document processing started", "documentId": request.documentId}


async def _process_and_update(request: ProcessRequest):
    result = await processor.process(
        document_id=request.documentId,
        file_path=request.filePath,
        file_type=request.fileType,
        org_id=request.orgId,
        metadata=request.metadata,
    )
    await _update_doc_status(request.documentId, result, request.orgId)


@router.post("/process-url")
async def process_url(request: ProcessURLRequest, background_tasks: BackgroundTasks):
    """Trigger async URL document processing"""
    background_tasks.add_task(_process_url_and_update, request)
    return {"message": "URL processing started", "documentId": request.documentId}


async def _process_url_and_update(request: ProcessURLRequest):
    result = await processor.process_url(
        document_id=request.documentId,
        url=request.url,
        org_id=request.orgId,
    )
    await _update_doc_status(request.documentId, result, request.orgId)


@router.post("/query")
async def query_knowledge_base(request: QueryRequest):
    """Direct RAG query (for internal use)"""
    result = await rag_query(
        question=request.question,
        org_id=request.orgId,
        n_results=request.nResults,
        filter_dict=request.filters,
    )
    return result


@router.post("/search")
async def semantic_search(request: QueryRequest):
    """Semantic vector search returning raw chunks"""
    chunks = await search(request.question, request.orgId, n_results=request.nResults)
    return {"chunks": chunks, "count": len(chunks)}


@router.delete("/document/{document_id}")
async def delete_document(document_id: str, org_id: str):
    """Delete all vector embeddings for a document"""
    await delete_document_chunks(document_id, org_id)
    return {"message": "Document vectors deleted", "documentId": document_id}
