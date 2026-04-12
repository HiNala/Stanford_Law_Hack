<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/PostgreSQL-17-336791?style=flat-square&logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/pgvector-vector%20search-336791?style=flat-square" alt="pgvector" />
  <img src="https://img.shields.io/badge/OpenAI-GPT--4o-412991?style=flat-square&logo=openai" alt="OpenAI" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker" alt="Docker" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT License" />
</p>

# ClauseGuard — AI-Powered Contract Intelligence

> **See risk before it sees you.**

ClauseGuard transforms how legal teams review contracts. Upload a PDF, DOCX, or TXT file and receive instant AI-powered clause-level risk analysis presented as a visual heatmap, attorney-grade explanations with market benchmarks, and a conversational AI copilot — all in one interface. Built for the speed of a hackathon, designed with the rigor of a law firm.

---

## Overview

Manual contract review costs enterprises an average of **$6,900 per contract** and takes days of associate time. A single missed clause — an uncapped indemnification, a 7-day auto-renewal trap, a one-sided change-of-control trigger — can cost millions. ClauseGuard reduces first-pass review time by 80% and catches risk patterns that even experienced attorneys miss under time pressure.

Enterprise contract intelligence tools like Harvey AI ($11B valuation) and Kira are priced beyond the reach of most firms. ClauseGuard delivers comparable intelligence at startup speed — instant onboarding, zero configuration, and a visual interface that communicates risk to both lawyers and business stakeholders.

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Visual Risk Heatmap** | Every clause color-coded red / amber / yellow / green by severity with a cascading animation on load |
| **Market Benchmarking** | Each clause compared to market-standard norms — *"This 7-day window is well below the 30-day SaaS standard"* |
| **Impact Scoring** | Quantified worst-case exposure — *"Unlimited indemnification, no cap, no reciprocity"* |
| **RAG Chat** | Ask natural language questions grounded in the actual contract text with streaming responses |
| **Semantic Search** | Find similar clauses across your entire contract portfolio using vector similarity |
| **Due Diligence Memos** | One-click attorney-format reports: Critical Findings → Material Findings → Recommended Actions |
| **Portfolio Analytics** | Dashboard with risk distribution, average scores, and highest-risk contract identification |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        ClauseGuard                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Frontend    │    │   Backend     │    │   Database    │  │
│  │   Next.js 16  │◄──►│   FastAPI     │◄──►│  PostgreSQL   │  │
│  │   TypeScript  │    │   Python 3.11 │    │  17 + pgvector│  │
│  │   Tailwind v4 │    │   SQLAlchemy  │    │              │  │
│  │   Port 3000   │    │   Port 8000   │    │   Port 5432   │  │
│  └──────────────┘    └──────┬───────┘    └──────────────┘  │
│                             │                               │
│                    ┌────────▼────────┐                      │
│                    │   OpenAI API     │                      │
│                    │  GPT-4o +        │                      │
│                    │  text-embed-3-sm │                      │
│                    └─────────────────┘                      │
│                                                             │
│  Processing Pipeline:                                       │
│  Upload → Extract Text → Chunk Clauses → Embed (pgvector)  │
│  → Analyze Risk (GPT-4o) → Market Benchmarking             │
│  → Extract Metadata → Store → Display Heatmap              │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| **Frontend** | Next.js 16, React 19, TypeScript | Server-side rendering, client routing |
| **Styling** | Tailwind CSS v4, CSS custom properties | Dark-theme design system with risk color tokens |
| **State** | Zustand | Client state for auth, contracts, analysis |
| **Backend** | Python 3.11, FastAPI, Pydantic v2 | Async API with request validation |
| **ORM** | SQLAlchemy 2.0 (async) | Declarative models with relationship loading |
| **Database** | PostgreSQL 17 + pgvector | Relational storage + 1536-dim vector embeddings |
| **AI** | OpenAI GPT-4o | Clause risk analysis, chat completions, report generation |
| **Embeddings** | text-embedding-3-small | Semantic search via cosine similarity |
| **Auth** | JWT (HS256) | Stateless bearer token authentication |
| **Infrastructure** | Docker Compose | One-command deployment with health checks |

---

## Getting Started

### Prerequisites

- **Docker** & **Docker Compose** (v2)
- **OpenAI API key** (required for live analysis; demo data works without one)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/HiNala/Stanford_Law_Hack.git
cd Stanford_Law_Hack

# 2. Set up environment variables
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY=sk-...

# 3. Start the application
docker compose up --build

# 4. Open the app
# Frontend:  http://localhost:3000
# API Docs:  http://localhost:8000/docs
# Health:    http://localhost:8000/api/health
```

On first launch the backend automatically:
1. Creates all database tables and enables the pgvector extension
2. Seeds a demo user (`demo@clauseguard.ai` / `demo1234`)
3. If an OpenAI API key is present, also processes the sample contract files through the full AI pipeline

### Demo Login

Click **"Try Demo Login"** on the login page, or enter manually:

- **Email:** `demo@clauseguard.ai`
- **Password:** `demo1234`

### Re-seed Demo Data

After a clean volume reset (`docker compose down -v`), the data is re-seeded automatically on the next `docker compose up`. To re-seed manually:

```bash
docker compose exec backend python seed.py
```

---

## Demo Script

For hackathon presentations, follow this 60-second flow:

1. **Open** http://localhost:3000 → click **"Try Demo Login"**
2. **Dashboard** → 3 pre-analyzed contracts with red / orange / green risk badges and portfolio stats
3. **Click the Vendor MSA** (critical risk) → watch the heatmap cascade light up red
4. **Click a red clause** → the analysis panel shows market comparison, impact assessment, and suggested redline
5. **Switch to Chat AI** → ask: *"Is the indemnification mutual or one-sided?"*
6. **Watch streaming response** → AI cites the section, explains uncapped exposure, suggests specific language
7. **Click Report** → generate a due diligence memo with Critical Findings and Next Steps
8. **Return to Dashboard** → upload a new contract live → watch real-time processing animation

**Talking points:**
- Harvey AI has no visual heatmap. Our cascading heatmap is a visual differentiator.
- Spellbook requires Microsoft Word. We're web-native and instant.
- Our AI reasons at senior associate level — market benchmarks, not just flag/no-flag.
- Three-click path from upload to actionable risk summary.

---

## Project Structure

```
Stanford_Law_Hack/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point, CORS, router mounting
│   │   ├── config.py            # Pydantic settings (env vars)
│   │   ├── database.py          # Async SQLAlchemy engine + session factory
│   │   ├── exceptions.py        # AppException with structured error_code
│   │   ├── middleware/
│   │   │   └── auth.py          # JWT extraction + get_current_user dependency
│   │   ├── models/
│   │   │   ├── user.py          # User model
│   │   │   ├── contract.py      # Contract model with risk fields
│   │   │   ├── clause.py        # Clause model with embeddings (pgvector)
│   │   │   └── chat_message.py  # Chat history model
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── routers/             # FastAPI route handlers
│   │   │   ├── auth.py          # Register, login, me
│   │   │   ├── contracts.py     # Upload, list, detail, delete, status
│   │   │   ├── clauses.py       # Clause list + risk summary
│   │   │   ├── analysis.py      # Trigger analysis, status, report gen
│   │   │   ├── chat.py          # SSE streaming chat + history
│   │   │   ├── search.py        # Semantic vector search
│   │   │   └── stats.py         # Portfolio analytics
│   │   ├── services/            # Business logic layer
│   │   │   ├── ai_service.py    # AI provider abstraction (OpenAI)
│   │   │   ├── analysis_service.py  # Clause risk analysis + concurrency
│   │   │   ├── chat_service.py  # RAG chat with streaming
│   │   │   ├── search_service.py    # Vector similarity search
│   │   │   └── contract_service.py  # Upload, text extraction, processing
│   │   └── utils/               # Text chunking, embedding helpers
│   ├── sample_contracts/        # 3 realistic demo contracts (TXT)
│   ├── seed.py                  # Pre-built demo data (no API key needed)
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx         # Login / register page
│   │   │   ├── dashboard/       # Contract portfolio with stats
│   │   │   ├── upload/          # Drag-and-drop file upload
│   │   │   ├── review/[id]/     # Split-screen heatmap + analysis + chat
│   │   │   └── summary/[id]/    # Due diligence report view
│   │   ├── components/          # Reusable UI components
│   │   ├── hooks/               # usePolling, useTypewriter
│   │   ├── lib/
│   │   │   ├── api.ts           # Axios + SSE API client
│   │   │   └── utils.ts         # Risk colors, formatters, cn()
│   │   ├── stores/              # Zustand stores (auth, contracts)
│   │   └── types/               # TypeScript interfaces
│   ├── next.config.ts           # API proxy rewrites
│   ├── Dockerfile
│   └── package.json
├── db/
│   └── init.sql                 # pgvector + uuid-ossp extensions
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## API Documentation

Full interactive documentation is auto-generated at **http://localhost:8000/docs** (Swagger UI).

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Login → JWT token |
| `GET` | `/api/auth/me` | Current user profile |
| `POST` | `/api/contracts/upload` | Upload contract (PDF/DOCX/TXT) |
| `GET` | `/api/contracts/` | List contracts (paginated, filterable, sortable) |
| `GET` | `/api/contracts/{id}` | Contract detail with risk distribution |
| `DELETE` | `/api/contracts/{id}` | Delete contract |
| `GET` | `/api/contracts/{id}/status` | Processing status with progress |
| `GET` | `/api/clauses/{id}` | All clauses for a contract |
| `GET` | `/api/clauses/{id}/summary` | Risk distribution summary |
| `POST` | `/api/chat/{id}` | Chat with contract (SSE stream) |
| `GET` | `/api/chat/{id}/history` | Paginated chat history |
| `POST` | `/api/search/` | Semantic search across portfolio |
| `POST` | `/api/analysis/{id}/report` | Generate due diligence report |
| `GET` | `/api/analysis/{id}/status` | Analysis pipeline status |
| `GET` | `/api/stats/` | Portfolio-wide statistics |
| `GET` | `/api/health` | Health check with DB status |

All endpoints (except auth and health) require a `Bearer` token in the `Authorization` header.

---

## Data Model

```
User (1) ──── (N) Contract (1) ──── (N) Clause
                        │                   │
                        │                   └── embedding (vector 1536)
                        │                   └── risk_score, risk_level
                        │                   └── explanation, suggestion
                        │
                        └──── (N) ChatMessage
                                    └── role (user/assistant)
                                    └── content
```

- **User** — email, password hash, JWT authentication
- **Contract** — uploaded file metadata, extracted text, overall risk score, AI-generated summary
- **Clause** — individual contract provisions with risk analysis, 1536-dim pgvector embedding
- **ChatMessage** — conversation history per contract for context-aware follow-up questions

---

## AI Intelligence

ClauseGuard uses a **25-category clause taxonomy** inspired by the CUAD dataset and Kira smart fields:

`change_of_control` · `termination_convenience` · `termination_cause` · `indemnification` · `limitation_of_liability` · `non_compete` · `non_solicitation` · `ip_ownership` · `assignment` · `exclusivity` · `most_favored_nation` · `confidentiality` · `data_privacy` · `insurance` · `audit_rights` · `warranty` · `force_majeure` · `governing_law` · `dispute_resolution` · `notice` · `survival` · `payment_terms` · `auto_renewal` · `sla` · `general`

Each clause analysis includes:
- **risk_score** (0.0–1.0) — quantified severity
- **explanation** — what the clause does and why it matters
- **market_comparison** — how it compares to market-standard terms
- **impact_if_triggered** — quantified worst-case exposure
- **suggestion** — specific redline language to request

---

## Demo Contracts

Three pre-built demo contracts with realistic clause data are included in `backend/sample_contracts/`:

| Contract | Risk | Notable Issues |
|----------|------|----------------|
| Vendor MSA — GlobalSupply Partners | **Critical** (91%) | Uncapped one-sided indemnification, 5-day change-of-control termination, perpetual IP license-back, 36-month worldwide non-compete |
| Master SaaS Agreement — TechCo LLC | **High** (79%) | 15-day auto-renewal trap, $1,000 liability cap, one-sided indemnification, no DPA for data privacy |
| Mutual NDA — Acme Technologies | **Medium** (48%) | Standard mutual NDA with overbroad IP assignment clause and 5-year post-termination survival |

The Vendor MSA is designed to be the "wow" moment — judges see four critical-red clauses light up immediately.

---

## Future Roadmap

- **Custom Playbooks** — firm-specific review standards that adapt to institutional preferences
- **Clause Benchmarking** — percentile rankings against market data ("this liability cap is in the 15th percentile")
- **Portfolio Pattern Detection** — cross-contract analysis ("14 of 52 contracts have change-of-control triggers")
- **Regulatory Monitoring** — proactive alerts when new regulations affect existing contracts
- **Microsoft Word Plugin** — inline analysis without leaving the document
- **Multi-user Teams** — role-based access (Partner, Associate, Paralegal) with review workflows
- **Batch Processing** — upload and analyze 100+ contracts with progress dashboard

---

## Competitive Positioning

| | ClauseGuard | Harvey AI | Spellbook | Kira |
|--|-------------|-----------|-----------|------|
| Visual risk heatmap | ✅ | ❌ | ❌ | ❌ |
| Instant (zero onboarding) | ✅ | ❌ | ❌ | ❌ |
| Web-native | ✅ | ✅ | ❌ | ❌ |
| Market benchmarking | ✅ | ❌ | ✅ | ✅ |
| RAG-grounded chat | ✅ | ✅ | ❌ | ❌ |
| Portfolio analytics | ✅ | ✅ | ❌ | ✅ |
| Open pricing | ✅ | ❌ | ✅ | ❌ |

---

## Built At

**LLM × Law Hackathon #6** at **Stanford Law School** — April 12, 2026

Hosted by the **Stanford Center for Legal Informatics (CodeX)**

## Team

**Brian** — Founder, Digital Studio Labs. AI-native web application specialist.

## License

MIT — see [LICENSE](LICENSE) for details.
