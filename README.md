# ClauseGuard — AI-Powered Contract Intelligence

> **See risk before it sees you.**

Built at the **Stanford LLM x Law Hackathon #6** (April 12, 2026) — hosted by Stanford Center for Legal Informatics (CodeX).

---

## What It Does

ClauseGuard helps legal teams instantly analyze contracts for risk. Upload a PDF, DOCX, or TXT contract and get:

- **Visual Risk Heatmap** — every clause color-coded red/amber/green by risk level
- **AI-Powered Explanations** — plain-English analysis of why each clause matters
- **Suggested Alternatives** — safer language recommendations for high-risk clauses
- **RAG Chat** — ask follow-up questions grounded in the actual contract text
- **Semantic Search** — find similar clauses across your entire contract portfolio
- **Due Diligence Reports** — one-click exportable summary of all findings

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Compose                        │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │  Frontend    │  │   Backend    │  │   Database     │ │
│  │  Next.js 15  │  │  FastAPI     │  │  PostgreSQL 17 │ │
│  │  TypeScript  │→ │  Python 3.11 │→ │  + pgvector    │ │
│  │  Tailwind v4 │  │  SQLAlchemy  │  │                │ │
│  │  Port 3000   │  │  Port 8000   │  │  Port 5432     │ │
│  └─────────────┘  └──────────────┘  └────────────────┘ │
│                          │                              │
│                    ┌─────┴─────┐                        │
│                    │  OpenAI   │                        │
│                    │  GPT-4o   │                        │
│                    │  Embed-3  │                        │
│                    └───────────┘                        │
└─────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, TypeScript, Tailwind CSS v4, Zustand, Framer Motion, Lucide Icons |
| **Backend** | Python 3.11, FastAPI, SQLAlchemy (async), Pydantic v2 |
| **Database** | PostgreSQL 17 + pgvector (1536-dim embeddings) |
| **AI** | OpenAI GPT-4o (analysis, chat, summaries), text-embedding-3-small (semantic search) |
| **Infrastructure** | Docker Compose, JWT auth |

## Processing Pipeline

```
Upload → Extract Text (PDF/DOCX/TXT) → Chunk into Clauses → Generate Embeddings
    → Risk Analysis (GPT-4o) → Metadata Extraction → Visual Heatmap
```

## Quick Start

### Prerequisites
- Docker & Docker Compose
- OpenAI API key

### Setup

```bash
# Clone
git clone https://github.com/HiNala/Stanford_Law_Hack.git
cd Stanford_Law_Hack

# Create .env from template
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Launch
docker compose up --build
```

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

### First Use
1. Register an account at http://localhost:3000
2. Upload a contract (PDF, DOCX, or TXT)
3. Wait for AI analysis to complete (~30-60 seconds)
4. Explore the risk heatmap, click clauses for details
5. Chat with your contract using the AI copilot
6. Generate a due diligence report

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login, get JWT |
| POST | `/api/contracts/upload` | Upload contract file |
| GET | `/api/contracts/` | List all contracts |
| GET | `/api/contracts/{id}` | Get contract details |
| GET | `/api/clauses/{id}` | Get all clauses for a contract |
| GET | `/api/clauses/{id}/summary` | Risk distribution summary |
| POST | `/api/chat/{id}` | Chat with contract (SSE streaming) |
| POST | `/api/search/` | Semantic search across clauses |
| POST | `/api/analysis/{id}/report` | Generate due diligence report |
| GET | `/api/analysis/{id}/status` | Check processing status |

## Team

Built with AI-assisted development at Stanford Law School.

## License

MIT
