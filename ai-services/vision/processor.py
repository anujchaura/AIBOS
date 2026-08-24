"""
Vision Module – OCR, table extraction, image classification, document analysis
"""
import os
import io
import base64
from pathlib import Path
from typing import Dict, Any, List
import cv2
import numpy as np
from PIL import Image


class VisionProcessor:
    """Handles all computer vision and OCR tasks"""

    async def analyze(self, file_path: str, analysis_type: str = "auto", org_id: str = "") -> Dict[str, Any]:
        """Main entry point for vision analysis"""
        file_path = Path(file_path)
        suffix = file_path.suffix.lower()

        if analysis_type == "auto":
            analysis_type = self._detect_analysis_type(file_path)

        results = {}

        if analysis_type in ["ocr", "auto", "invoice", "document"]:
            results["ocr"] = await self._run_ocr(str(file_path))

        if analysis_type in ["invoice"]:
            results["invoice"] = self._extract_invoice_fields(results.get("ocr", {}).get("text", ""))

        if analysis_type in ["table"]:
            results["tables"] = self._extract_tables(str(file_path))

        if analysis_type in ["classification", "auto"]:
            results["classification"] = await self._classify_document(str(file_path), results.get("ocr", {}).get("text", ""))

        if analysis_type in ["chart"]:
            results["chart"] = await self._analyze_chart(str(file_path))

        results["analysis_type"] = analysis_type
        results["file_path"] = str(file_path)

        return results

    async def extract_tables(self, file_path: str) -> Dict[str, Any]:
        """Extract tables from image or PDF"""
        return {"tables": self._extract_tables(file_path)}

    def _detect_analysis_type(self, file_path: Path) -> str:
        """Auto-detect analysis type from file extension"""
        suffix = file_path.suffix.lower()
        if suffix in [".jpg", ".jpeg", ".png", ".webp"]:
            return "ocr"
        elif suffix == ".pdf":
            return "document"
        return "ocr"

    async def _run_ocr(self, file_path: str) -> Dict[str, Any]:
        """Run OCR or PDF text extraction"""
        if str(file_path).lower().endswith(".pdf"):
            try:
                import PyPDF2
                reader = PyPDF2.PdfReader(file_path)
                text_pages = [page.extract_text() for page in reader.pages if page.extract_text()]
                full_text = "\n\n".join(text_pages)
                return {
                    "text": full_text,
                    "pages": len(reader.pages),
                    "word_count": len(full_text.split()),
                    "engine": "pypdf2",
                }
            except Exception as pdf_err:
                pass

        try:
            import easyocr
            reader = easyocr.Reader(["en"], gpu=False, verbose=False)
            results = reader.readtext(file_path, detail=1)

            full_text = "\n".join([r[1] for r in results])
            words_with_confidence = [
                {"text": r[1], "confidence": round(float(r[2]), 3), "bbox": [[float(x) for x in pt] for pt in r[0]]}
                for r in results
            ]

            return {
                "text": full_text,
                "words": words_with_confidence[:50],  # Limit output
                "word_count": len(full_text.split()),
                "engine": "easyocr",
            }
        except Exception as e:
            return {"error": str(e), "text": "", "engine": "easyocr"}


    def _extract_invoice_fields(self, text: str) -> Dict[str, Any]:
        """Extract common invoice fields from OCR text using regex"""
        import re

        invoice_data = {
            "invoice_number": None,
            "date": None,
            "total_amount": None,
            "vendor_name": None,
            "gst_number": None,
            "line_items": [],
        }

        # Invoice number
        inv_match = re.search(r"(?:invoice|inv)[#\s:]*([A-Z0-9\-/]+)", text, re.I)
        if inv_match:
            invoice_data["invoice_number"] = inv_match.group(1)

        # Date
        date_match = re.search(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b", text)
        if date_match:
            invoice_data["date"] = date_match.group(1)

        # Total/Amount
        amount_match = re.search(r"(?:total|amount|grand total)[:\s₹$]*([0-9,]+\.?\d*)", text, re.I)
        if amount_match:
            invoice_data["total_amount"] = amount_match.group(1).replace(",", "")

        # GST Number (Indian format)
        gst_match = re.search(r"\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}\b", text)
        if gst_match:
            invoice_data["gst_number"] = gst_match.group(0)

        return invoice_data

    def _extract_tables(self, file_path: str) -> List[Dict]:
        """Extract tables using OpenCV contour detection"""
        try:
            img = cv2.imread(file_path)
            if img is None:
                return []

            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]

            # Detect horizontal and vertical lines
            kernel_h = cv2.getStructuringElement(cv2.MORPH_RECT, (img.shape[1] // 10, 1))
            kernel_v = cv2.getStructuringElement(cv2.MORPH_RECT, (1, img.shape[0] // 10))
            lines_h = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel_h)
            lines_v = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel_v)

            table_mask = cv2.bitwise_or(lines_h, lines_v)
            contours, _ = cv2.findContours(table_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            tables = []
            for cnt in contours:
                x, y, w, h = cv2.boundingRect(cnt)
                if w > 100 and h > 50:
                    tables.append({"x": x, "y": y, "width": w, "height": h})

            return tables
        except Exception as e:
            return [{"error": str(e)}]

    async def _classify_document(self, file_path: str, ocr_text: str = "") -> Dict[str, Any]:
        """Classify document type using OCR text + LLM"""
        if not ocr_text.strip():
            return {"type": "unknown", "confidence": 0.0}

        # Simple keyword-based classification
        text_lower = ocr_text.lower()
        classifications = {
            "invoice": ["invoice", "bill", "amount due", "payment", "total", "gst"],
            "contract": ["agreement", "party", "terms", "conditions", "clause", "whereas"],
            "report": ["summary", "analysis", "findings", "conclusion", "recommendation"],
            "resume": ["experience", "education", "skills", "objective", "career"],
            "form": ["fill", "complete", "signature", "date", "name", "address"],
        }

        scores = {}
        for doc_type, keywords in classifications.items():
            scores[doc_type] = sum(1 for kw in keywords if kw in text_lower) / len(keywords)

        best_type = max(scores, key=scores.get)
        best_score = scores[best_type]

        return {
            "type": best_type if best_score > 0.2 else "general_document",
            "confidence": round(min(best_score * 2, 0.95), 3),
            "all_scores": scores,
        }

    async def _analyze_chart(self, file_path: str) -> Dict[str, Any]:
        """Basic chart analysis (type detection)"""
        try:
            img = cv2.imread(file_path)
            if img is None:
                return {"error": "Could not read image"}

            h, w = img.shape[:2]
            return {
                "width": w, "height": h,
                "note": "Chart analysis requires GPT-4 Vision API integration",
                "detected": True,
            }
        except Exception as e:
            return {"error": str(e)}


vision_processor = VisionProcessor()
