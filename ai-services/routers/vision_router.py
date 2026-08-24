"""
Vision Router – FastAPI routes for vision and OCR
"""
import os
import shutil
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
from uuid import uuid4

from vision.processor import vision_processor

router = APIRouter()
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/analyze")
async def analyze_image(
    file: UploadFile = File(...),
    analysis_type: str = Form(default="auto"),
    org_id: str = Form(default=""),
):
    """Analyze an uploaded image/document"""
    # Save file temporarily
    ext = os.path.splitext(file.filename)[1]
    temp_path = os.path.join(UPLOAD_DIR, f"vision-{uuid4()}{ext}")

    try:
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        result = await vision_processor.analyze(temp_path, analysis_type, org_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass


@router.post("/extract-table")
async def extract_table(file: UploadFile = File(...)):
    """Extract tables from image"""
    ext = os.path.splitext(file.filename)[1]
    temp_path = os.path.join(UPLOAD_DIR, f"table-{uuid4()}{ext}")

    try:
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        result = await vision_processor.extract_tables(temp_path)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass
