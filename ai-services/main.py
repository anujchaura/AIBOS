"""
AIBOS AI Services – FastAPI Main Application
All AI modules loaded with graceful fallback – service starts even if optional modules fail.
"""
import os
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

# ─── Startup / Shutdown ──────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[AIBOS] AI Services starting...")
    try:
        from rag.vector_store import initialize_chroma
        await initialize_chroma()
        print("[OK] ChromaDB initialized")
    except Exception as e:
        print(f"[WARN] ChromaDB init warning: {e}")
    yield
    print("[STOP] AIBOS AI Services shutting down")

app = FastAPI(
    title="AIBOS AI Services",
    description="Enterprise AI Multi-Agent Business Operating System – AI Core",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ─── Middleware ──────────────────────────────────────────────────
app.add_middleware(CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# ─── API Key Auth ────────────────────────────────────────────────
API_KEY = os.getenv("AI_SERVICE_API_KEY", "internal_service_key_change_me")

@app.middleware("http")
async def verify_api_key(request: Request, call_next):
    if request.url.path in ["/health", "/docs", "/redoc", "/openapi.json"]:
        return await call_next(request)
    key = request.headers.get("X-API-Key", "")
    if key != API_KEY:
        return JSONResponse(status_code=401, content={"detail": "Invalid API key"})
    return await call_next(request)

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    response.headers["X-Process-Time-Ms"] = str(round(process_time, 2))
    return response

# ─── Load Routers with Graceful Fallback ────────────────────────
loaded_modules = []

def try_include_router(module_path: str, attr: str, prefix: str, tag: str):
    """Attempt to load a router; log and skip if it fails."""
    try:
        import importlib
        mod = importlib.import_module(module_path)
        router = getattr(mod, attr)
        app.include_router(router, prefix=prefix, tags=[tag])
        loaded_modules.append(tag)
        print(f"  [OK] {tag} router loaded")
    except Exception as e:
        print(f"  [WARN] {tag} router failed to load: {e}")

try_include_router("routers.rag_router",      "router", "/rag",       "RAG Pipeline")
try_include_router("routers.agents_router",   "router", "/agents",    "Multi-Agent AI")
try_include_router("routers.mcp_router",      "router", "/mcp",       "MCP Tools")
try_include_router("routers.vision_router",   "router", "/vision",    "Vision Module")
try_include_router("routers.workflow_router", "router", "/workflows", "Workflow Engine")
try_include_router("routers.decision_router", "router", "/decision",  "Decision Engine")

# ─── Health Check ────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "aibos-ai-services",
        "version": "1.0.0",
        "loaded_modules": loaded_modules,
        "total_modules": 6,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=False, log_level="info")
