# 🤖 AIBOS – Enterprise AI Multi-Agent Business Operating System

> **Assigned By:** Softwallet Innovative Technologies Pvt. Ltd.  
> **Assigned To:** Anuj Chaurasia  
> **Date:** July 24, 2026

---

## 🌟 Overview

AIBOS is a production-ready enterprise AI platform that functions as an **intelligent operating system for businesses**. It combines 7 specialized AI agents, a complete RAG pipeline, MCP tools, workflow automation, computer vision, and a real-time analytics dashboard into a unified platform.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      AIBOS Platform                             │
│                                                                 │
│  ┌──────────────┐    ┌─────────────────┐    ┌───────────────┐  │
│  │  Next.js 14  │───▶│  Express.js API │───▶│  FastAPI AI   │  │
│  │  Frontend    │    │  Gateway        │    │  Services     │  │
│  │  :3000       │    │  :5000          │    │  :8001        │  │
│  └──────────────┘    └─────────────────┘    └───────────────┘  │
│                              │                     │            │
│                       ┌──────┴──────┐    ┌────────┴──────┐     │
│                       │  MongoDB    │    │   ChromaDB    │     │
│                       │  :27017     │    │   :8000       │     │
│                       │  Redis      │    │   (Vectors)   │     │
│                       │  :6379      │    └───────────────┘     │
│                       └─────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

## 📦 Modules

| # | Module | Description |
|---|--------|-------------|
| 1 | **Auth & RBAC** | JWT + MFA authentication, role-based access control |
| 2 | **Knowledge Base** | Upload PDF/DOCX/Excel/Images → RAG pipeline |
| 3 | **Multi-Agent AI** | 7 specialized agents + AI Orchestrator |
| 4 | **MCP Tools** | Calculator, Weather, Web Search, Python REPL, Email, etc. |
| 5 | **RAG Pipeline** | Full document → chunk → embed → retrieve → generate |
| 6 | **Workflow Engine** | Event-driven automation with Celery + Redis |
| 7 | **Vision Module** | OCR, invoice detection, table extraction |
| 8 | **Decision Engine** | Proactive AI business recommendations |
| 9 | **Analytics Dashboard** | Real-time KPIs, Recharts visualizations |
| 10 | **Explainable AI** | Confidence, reasoning, sources on every response |

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- Python 3.11+
- Docker & Docker Compose
- An OpenAI API key (or Gemini API key)

### Option 1: Docker Compose (Recommended)

```bash
# Clone/download the project
cd "Enterprise AI Multi-Agent Business Operating System (AIBOS)"

# Copy and configure environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Start all services
docker-compose up -d
```

Open http://localhost:3000

### Option 2: Manual Setup

**1. Backend (Express)**
```bash
cd backend
npm install
# Create .env with your variables
npm run dev    # Runs on :5000
```

**2. AI Services (FastAPI)**
```bash
cd ai-services
pip install -r requirements.txt
# Create .env
uvicorn main:app --reload --port 8001
```

**3. Frontend (Next.js)**
```bash
cd frontend
npm install
# Create .env.local
npm run dev    # Runs on :3000
```

**4. Infrastructure**
```bash
# MongoDB
docker run -d -p 27017:27017 --name mongo mongo:7.0

# Redis
docker run -d -p 6379:6379 --name redis redis:7-alpine

# ChromaDB
docker run -d -p 8000:8000 --name chroma chromadb/chroma
```

## 🔑 Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key (required for AI features) |
| `JWT_SECRET` | Secret for JWT token signing |
| `MONGODB_URI` | MongoDB connection string |
| `REDIS_URL` | Redis connection string |

## 📁 Project Structure

```
AIBOS/
├── frontend/                 # Next.js 14 (TypeScript + Tailwind)
│   └── src/app/
│       ├── (auth)/          # Login, Register
│       └── (dashboard)/     # All 10 module UIs
│
├── backend/                  # Express.js API Gateway
│   ├── models/              # MongoDB models
│   ├── routes/              # API routes
│   └── middleware/          # Auth, RBAC, Audit
│
├── ai-services/              # FastAPI Python AI Core
│   ├── agents/              # 7 AI Agents + Orchestrator
│   ├── rag/                 # RAG pipeline components
│   ├── mcp/                 # MCP tool implementations
│   ├── vision/              # OCR + Computer Vision
│   ├── workflow/            # Celery workflow engine
│   ├── decision/            # Decision engine
│   └── routers/             # FastAPI route handlers
│
├── docker-compose.yml
├── .env.example
└── README.md
```

## 🤖 AI Agents

| Agent | Domain | Icon |
|-------|--------|------|
| AI Orchestrator | Auto-routes to best agent | 🤖 |
| CEO Agent | Business strategy & vision | 👔 |
| Finance Agent | Revenue, expenses, financial analysis | 💰 |
| HR Agent | Employee analytics, hiring, policies | 👥 |
| Sales Agent | Lead scoring, CRM, forecasting | 📈 |
| Legal Agent | Contract review, compliance | ⚖️ |
| Research Agent | Market research, competitor analysis | 🔬 |
| Operations Agent | Inventory, supply chain, workflows | ⚙️ |

## 📡 API Documentation

All APIs are available at `http://localhost:5000/api/`

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/register` | Create account |
| `POST /api/auth/login` | Login (+ MFA) |
| `GET /api/agents/list` | List AI agents |
| `POST /api/agents/chat` | Chat with agents |
| `POST /api/knowledge/upload` | Upload document |
| `GET /api/analytics/overview` | Dashboard KPIs |
| `POST /api/workflows` | Create workflow |
| `GET /api/decision/recommendations` | AI recommendations |
| `POST /api/vision/analyze` | Vision analysis |
| `GET /api/mcp/tools` | List MCP tools |

FastAPI docs: `http://localhost:8001/docs`

## 🛠️ Technology Stack

**Frontend:** Next.js 14, TypeScript, Tailwind CSS, Recharts, Socket.io  
**Backend:** Node.js, Express.js, MongoDB, Redis, Socket.io  
**AI Services:** Python, FastAPI, LangChain, OpenAI GPT-4o  
**Vector DB:** ChromaDB  
**OCR/Vision:** EasyOCR, OpenCV  
**Task Queue:** Celery + Redis  
**Infrastructure:** Docker Compose  

## 📊 System Architecture Diagram

```
User Request
    │
    ▼
Next.js Frontend (Port 3000)
    │
    ▼ REST API / WebSocket
Express.js Gateway (Port 5000)
    │
    ├── MongoDB (Auth, Docs, Conversations)
    ├── Redis (Cache, Sessions)
    │
    ▼ Internal API
FastAPI AI Services (Port 8001)
    │
    ├── AI Orchestrator
    │     ├── CEO Agent ──────┐
    │     ├── Finance Agent   │
    │     ├── HR Agent        ├── RAG Pipeline → ChromaDB
    │     ├── Sales Agent     │
    │     ├── Legal Agent     │
    │     ├── Research Agent  │
    │     └── Operations Agent┘
    │
    ├── MCP Server (Tools)
    ├── Vision Module
    ├── Workflow Engine (Celery)
    └── Decision Engine
```

## 🔒 Security Features
- JWT access tokens (15min) + Refresh tokens (7 days)
- Token rotation on refresh
- TOTP Multi-Factor Authentication
- Role-Based Access Control (5 roles)
- Organization data isolation
- Rate limiting on auth endpoints
- Comprehensive audit logging
- Input validation on all endpoints

## 🚀 Deployment

### Docker Compose (All Services)
```bash
docker-compose up -d
docker-compose logs -f  # Monitor logs
docker-compose down     # Stop all
```

### Individual Services
```bash
docker-compose up -d mongodb redis chromadb  # Just infrastructure
npm run dev   # Backend
uvicorn main:app --reload  # AI Services
npm run dev   # Frontend
```

---

**Built with ❤️ for Softwallet Innovative Technologies Pvt. Ltd.**
