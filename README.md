<p align="center">
  <img src="https://img.shields.io/badge/Built%20At-Stanford%20Law%20LLM%20%C3%97%20Law%20Hackathon%20%236-8B1A1A?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0tMiAxNWwtNS01IDEuNDEtMS40MUwxMCAxNC4xN2w3LjU5LTcuNTlMMTkgOGwtOSA5eiIvPjwvc3ZnPg==" alt="Built at Stanford Law Hackathon 6" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi" />
  <img src="https://img.shields.io/badge/PostgreSQL-17%20+%20pgvector-336791?style=flat-square&logo=postgresql" />
  <img src="https://img.shields.io/badge/OpenAI-GPT--4o-412991?style=flat-square&logo=openai" />
  <img src="https://img.shields.io/badge/TrustFoundry-Legal%20AI-4F46E5?style=flat-square" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker" />
  <img src="https://img.shields.io/badge/License-MIT-22c55e?style=flat-square" />
</p>

<h1 align="center">ClauseGuard — AI Contract Intelligence</h1>

<p align="center"><strong>See risk before it sees you.</strong></p>

<p align="center">
  Upload any contract. Get an instant AI-powered heatmap, verified legal citations, and a conversational copilot — all in under 30 seconds.
</p>

---

## The Problem

Every contract negotiation is a minefield. A single overlooked clause — an uncapped indemnification, a 90-day auto-renewal trap, a one-sided change-of-control trigger — can cost millions and take years to unwind.

Manual contract review costs enterprises an average of **$6,900 per contract** and takes days of associate time. Enterprise AI tools like Harvey AI ($11B valuation) and Kira cost hundreds of thousands annually. Smaller firms get nothing.

**ClauseGuard levels the playing field.**

---

## Real-World Use Cases

### 🏢 M&A Due Diligence
An acquirer's legal team reviews 40+ vendor contracts during a 72-hour due diligence window. ClauseGuard ingests every contract, surfaces a risk-ranked portfolio dashboard, and flags the three critical provisions that could tank the deal — in minutes, not days.

### 📋 SaaS Vendor Review
A startup is about to sign a cloud infrastructure agreement. ClauseGuard catches the buried auto-renewal clause requiring 90-day cancellation notice and the $5,000 liability cap buried in Section 5 — before the contract is signed.

### 👔 Executive Employment
HR and legal are onboarding a VP Engineering. ClauseGuard flags the non-compete clause that is almost certainly void under California law, the off-hours invention assignment provision, and the arbitration waiver — protecting the company and the employee.

### 🔒 NDA Portfolio Management
A law firm manages hundreds of NDAs for clients. ClauseGuard tracks non-compete scope, survival periods, and IP assignment provisions across the entire portfolio with semantic search — "show me all NDAs with nationwide non-compete clauses."

---

## What ClauseGuard Does

| Feature | Description |
|---------|-------------|
| **Visual Risk Heatmap** | Every clause color-coded critical/high/medium/low with a cascading animation on load |
| **AI Risk Scoring** | GPT-4o scores each clause with quantified exposure, market benchmarks, and redline suggestions |
| **Verified Legal Citations** | TrustFoundry grounds every high-risk finding in verified US laws, regulations, and case law |
| **RAG Chat Copilot** | Ask natural-language questions; the AI answers grounded in the exact contract text |
| **Semantic Clause Search** | Find similar clauses across your entire portfolio using vector similarity |
| **Portfolio Analytics** | Risk distribution, average scores, cross-contract pattern detection |
| **Due Diligence Reports** | One-click attorney-format memos: Critical Findings → Material Issues → Recommended Actions |
| **Dark + Light Mode** | Fully themed UI for long review sessions |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ClauseGuard Platform                            │
├──────────────────┬──────────────────────────┬───────────────────────────┤
│   BROWSER        │   BACKEND (Docker)        │   PERSISTENCE             │
│                  │                           │                           │
│  Next.js 15      │  FastAPI (Python 3.11)    │  PostgreSQL 17            │
│  React 19        │  ┌────────────────────┐   │  + pgvector extension     │
│  TypeScript      │  │  Contract Service  │   │                           │
│  Tailwind CSS    │  │  ─ PDF/TXT extract │   │  Tables:                  │
│  Zustand         │  │  ─ Clause chunking │   │  ├─ users                 │
│  Framer Motion   │  │  ─ Risk analysis   │   │  ├─ contracts             │
│                  │  └────────┬───────────┘   │  ├─ clauses               │
│  Pages:          │           │               │  │   └─ embedding VECTOR  │
│  /               │  ┌────────▼───────────┐   │  │      (1536 dims)       │
│  /dashboard      │  │  Analysis Service  │   │  └─ chat_messages         │
│  /upload         │  │  ─ GPT-4o scoring  │   │                           │
│  /review/[id]    │  │  ─ TrustFoundry    │   └───────────────────────────┘
│  /portfolio-     │  │    enrichment      │
│    report        │  └────────┬───────────┘
│                  │           │
│  API Client:     │  ┌────────▼───────────┐   ┌───────────────────────────┐
│  /api/* → proxy  │  │  Chat Service      │   │   EXTERNAL AI SERVICES    │
│  to backend      │  │  ─ RAG pipeline    │   │                           │
│                  │  │  ─ SSE streaming   │   │  OpenAI API               │
│  Auth:           │  └────────────────────┘   │  ├─ gpt-4o                │
│  JWT in          │                           │  │   (risk analysis,       │
│  localStorage    │  ┌────────────────────┐   │  │    chat, reports)       │
│                  │  │  Search Service     │   │  └─ text-embedding-3-small│
│                  │  │  ─ cosine sim       │   │       (1536-dim vectors)  │
│                  │  │  ─ pgvector ANN     │   │                           │
│                  │  └────────────────────┘   │  TrustFoundry API         │
│                  │                           │  ├─ /public/v1/agentic-   │
│                  │  Async: asyncio.gather    │  │    search               │
│                  │  SQLAlchemy async ORM     │  ├─ NDJSON streaming       │
│                  │  Pydantic v2 validation   │  ├─ 14M+ US laws &        │
│                  │  JWT (HS256) auth         │  │   regulations           │
│                  │                           │  └─ Verified citations     │
└──────────────────┴──────────────────────────┴───────────────────────────┘

Contract Processing Pipeline
══════════════════════════════════════════════════════════════════
 Upload (PDF/TXT)
      │
      ▼
 Text Extraction (PyMuPDF for PDFs, UTF-8 for TXT)
      │
      ▼
 Clause Chunking (rule-based splitter → 200-800 token segments)
      │
      ▼
 Embedding (text-embedding-3-small → 1536-dim vectors → pgvector)
      │
      ▼
 Risk Analysis (GPT-4o → score + explanation + market_comparison
               + impact_if_triggered + suggestion + clause_type)
      │
      ▼
 Legal Grounding (TrustFoundry agentic-search → verified citations
                  for high/critical clauses with NDJSON streaming)
      │
      ▼
 Metadata Extraction (GPT-4o → parties, dates, governing law,
                      contract type, executive summary)
      │
      ▼
 Status → "analyzed" | Heatmap ready in browser
══════════════════════════════════════════════════════════════════
```

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 15 | React framework, App Router, API proxy rewrites |
| **React** | 19 | Component model, concurrent rendering |
| **TypeScript** | 5 | Type safety across entire frontend |
| **Tailwind CSS** | 4 | Utility-first styling, dark/light mode via CSS custom properties |
| **Zustand** | 4 | Lightweight client state (auth, contracts, clauses) |
| **Framer Motion** | — | Heatmap cascade animations, clause reveal transitions |
| **Axios** | — | HTTP client with JWT interceptor |
| **react-dropzone** | — | Drag-and-drop contract upload |
| **react-markdown** | — | Streaming AI response rendering |
| **lucide-react** | — | Icon system |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Python** | 3.11 | Language runtime |
| **FastAPI** | 0.115 | Async REST API framework |
| **Pydantic** | 2 | Request/response validation and serialization |
| **SQLAlchemy** | 2.0 | Async ORM with declarative models |
| **asyncpg** | — | High-performance PostgreSQL async driver |
| **httpx** | — | Async HTTP client for TrustFoundry API |
| **PyMuPDF (fitz)** | 1.25 | PDF text extraction |
| **python-jose** | — | JWT creation and verification (HS256) |
| **passlib[bcrypt]** | — | Password hashing |
| **uvicorn** | — | ASGI server |

### Database & AI
| Technology | Purpose |
|-----------|---------|
| **PostgreSQL 17** | Relational data storage |
| **pgvector** | 1536-dimensional vector embeddings for semantic search |
| **OpenAI GPT-4o** | Clause risk analysis, RAG chat completions, report generation |
| **OpenAI text-embedding-3-small** | Semantic clause embeddings |
| **TrustFoundry** | Legal grounding — 14M+ US laws, regulations, and case law |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| **Docker** | Container runtime |
| **Docker Compose** | Multi-service orchestration (db + backend + frontend) |
| **Named volumes** | Persistent PostgreSQL data and uploaded files |
| **Health checks** | Container startup sequencing (db → backend → frontend) |

---

## Getting Started

### Prerequisites

- **Docker** & **Docker Compose** v2+
- **OpenAI API key** — required for AI analysis
- **TrustFoundry API key** — optional; falls back to curated legal citations

### Quick Start

```bash
# 1. Clone
git clone https://github.com/HiNala/Stanford_Law_Hack.git
cd Stanford_Law_Hack

# 2. Configure
cp .env.example .env
# Edit .env:
#   OPENAI_API_KEY=sk-...
#   TRUSTFOUNDRY_API_KEY=tf-...   (optional but recommended)

# 3. Launch
docker compose up --build

# 4. Open
open http://localhost:3000
# API docs: http://localhost:8000/docs
```

The backend auto-seeds on first launch:
1. Creates DB schema and enables pgvector
2. Creates `demo@clauseguard.ai` / `demo1234`
3. Uploads and analyzes 4 demo contracts through the full AI pipeline

### Demo Login

```
Email:    demo@clauseguard.ai
Password: demo1234
```

Or click **"Try Demo Login"** on the login page.

---

## Demo Script (60 seconds)

Optimized for hackathon judges and live demos:

1. **Landing page** → show the tagline and feature cards
2. **Login** → click "Try Demo Login"
3. **Dashboard** → 4 pre-analyzed contracts, risk badges, portfolio stats bar
4. **Click "Master Cloud Services Agreement"** (Critical, 91%) → heatmap cascades red
5. **Click a red clause** → right panel shows: risk score, market comparison, worst-case impact, redline suggestion, and **TrustFoundry legal citation**
6. **Switch to "Chat AI"** → type: *"Is the indemnification mutual or one-sided?"*
7. **Watch streaming response** → AI explains the uncapped exposure, cites the section
8. **Click "Report"** → instant due-diligence memo
9. **Dashboard → Portfolio Report** → cross-contract risk intelligence
10. **Upload** → drag a new PDF → watch the processing animation → heatmap appears

**Key talking points:**
- Harvey AI has no visual heatmap. Our cascading heatmap shows risk at a glance.
- Every high-risk finding is grounded in verified case law via **TrustFoundry**.
- Three clicks from upload to actionable risk summary.
- Works with any contract format — PDF, DOCX, TXT.

---

## Demo Contracts

Four realistic contracts covering the "AcquiTech Capital acquiring Meridian Holdings" scenario:

| Contract | Risk | Key Issues |
|----------|------|------------|
| **Master Cloud Services Agreement** | 🔴 Critical | Perpetual data license, $5K liability cap, 90-day auto-renewal, uncapped indemnification by Company |
| **Mutual Non-Disclosure Agreement** | 🟠 High | 36-month US/EU/Canada non-compete (likely void under CA law), $250K liquidated damages per solicited employee |
| **Executive Employment Agreement** | 🟠 High | 180-day non-compete (void under CA Bus. & Prof. Code § 16600), off-hours IP assignment, no equity acceleration on acquisition |
| **Vendor Master Services Agreement** | 🟡 Medium | Broad production system access by vendor, 12-month liability cap, adequate SLA with minor gaps |

All contracts are in `samples/` as both `.pdf` (upload-ready) and `.md` (risk annotation reference).

**TrustFoundry citations demonstrated:**
- *Edwards v. Arthur Andersen LLP (2008)* — non-compete void under CA law
- *Cal. Bus. & Prof. Code § 16600* — prohibition on restrictive covenants
- *California Labor Code § 2870* — limits on off-hours invention assignment
- CCPA / CPRA compliance for data sub-processing
- *Iskanian v. CLS Transportation LA (2014)* — class action waiver in employment arbitration

---

## Project Structure

```
Stanford_Law_Hack/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI entry, CORS, router mounting
│   │   ├── config.py                # Pydantic settings (env vars)
│   │   ├── database.py              # Async SQLAlchemy engine + sessions
│   │   ├── middleware/auth.py        # JWT extraction, get_current_user
│   │   ├── models/                  # SQLAlchemy ORM models
│   │   │   ├── user.py
│   │   │   ├── contract.py          # + risk fields, JSON metadata
│   │   │   ├── clause.py            # + pgvector embedding column
│   │   │   └── chat_message.py
│   │   ├── schemas/                 # Pydantic v2 request/response schemas
│   │   ├── routers/                 # FastAPI route handlers
│   │   │   ├── auth.py              # Register, login, me
│   │   │   ├── contracts.py         # Upload, list, detail, delete
│   │   │   ├── clauses.py           # Clause list + risk summary
│   │   │   ├── analysis.py          # Trigger, status, report
│   │   │   ├── chat.py              # SSE streaming chat + history
│   │   │   ├── search.py            # Semantic vector search
│   │   │   └── stats.py             # Portfolio analytics
│   │   ├── services/
│   │   │   ├── ai_service.py        # OpenAI abstraction layer
│   │   │   ├── analysis_service.py  # Clause analysis + TrustFoundry enrichment
│   │   │   ├── chat_service.py      # RAG pipeline + SSE streaming
│   │   │   ├── search_service.py    # pgvector cosine similarity
│   │   │   ├── contract_service.py  # Upload, extraction, pipeline
│   │   │   └── trustfoundry_service.py  # TrustFoundry NDJSON integration
│   │   └── utils/                   # Chunking, embedding helpers
│   ├── seed.py                      # Auto-seeds demo account on startup
│   ├── generate_demo_contracts.py   # Generates sample PDFs via fpdf2
│   ├── upload_demo_contracts.py     # Uploads samples to demo account
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx             # Landing page
│   │   │   ├── login/               # Auth (login + register)
│   │   │   ├── dashboard/           # Contract portfolio + analytics
│   │   │   ├── upload/              # Drag-and-drop upload
│   │   │   ├── review/[id]/         # Heatmap + analysis + chat
│   │   │   └── portfolio-report/    # Cross-contract AI report
│   │   ├── components/
│   │   │   ├── layout/header.tsx    # Main nav with Logo
│   │   │   ├── providers/           # ThemeProvider
│   │   │   └── ui/
│   │   │       ├── logo.tsx         # SVG ClauseGuard logo
│   │   │       ├── theme-toggle.tsx # Dark/light mode toggle
│   │   │       └── hero-section.tsx # Landing page hero
│   │   ├── hooks/
│   │   │   ├── use-polling.ts       # Contract status polling
│   │   │   └── use-typewriter.ts    # Streaming text animation
│   │   ├── lib/
│   │   │   ├── api.ts               # Axios client + SSE streaming
│   │   │   └── utils.ts             # Risk color helpers, formatters
│   │   ├── stores/
│   │   │   ├── auth-store.ts        # JWT + user state
│   │   │   ├── contract-store.ts    # Contracts + clauses state
│   │   │   └── theme-store.ts       # Dark/light theme (localStorage)
│   │   └── types/index.ts           # TypeScript interfaces
│   ├── next.config.ts               # /api/* proxy to backend
│   ├── Dockerfile
│   └── package.json
├── samples/
│   ├── master-cloud-services-agreement.pdf   # Critical risk demo
│   ├── master-cloud-services-agreement.md    # Annotated risk reference
│   ├── mutual-nda-meridian-acquitech.pdf     # High risk demo
│   ├── mutual-nda-meridian-acquitech.md
│   ├── executive-employment-agreement-sarah-chen.pdf  # High risk demo
│   ├── executive-employment-agreement-sarah-chen.md
│   ├── vendor-msa-cloudinfra.pdf             # Medium risk demo
│   └── vendor-msa-cloudinfra.md
├── db/init.sql                      # pgvector + uuid-ossp setup
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## API Reference

Full Swagger UI available at `http://localhost:8000/docs`.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | — | Create account |
| `POST` | `/api/auth/login` | — | Login → JWT |
| `GET` | `/api/auth/me` | ✓ | Current user |
| `POST` | `/api/contracts/upload` | ✓ | Upload PDF/TXT (triggers async analysis) |
| `GET` | `/api/contracts/` | ✓ | List contracts with risk scores |
| `GET` | `/api/contracts/{id}` | ✓ | Contract detail |
| `DELETE` | `/api/contracts/{id}` | ✓ | Delete contract |
| `GET` | `/api/clauses/{id}` | ✓ | All clauses with risk + TrustFoundry data |
| `GET` | `/api/clauses/{id}/summary` | ✓ | Risk distribution summary |
| `POST` | `/api/analysis/{id}/analyze` | ✓ | Trigger / re-trigger analysis |
| `GET` | `/api/analysis/{id}/status` | ✓ | Pipeline status |
| `POST` | `/api/analysis/{id}/report` | ✓ | Generate due diligence report |
| `POST` | `/api/analysis/portfolio-report` | ✓ | Cross-contract portfolio report |
| `POST` | `/api/chat/{id}` | ✓ | Chat (SSE streaming, RAG-grounded) |
| `GET` | `/api/chat/{id}/history` | ✓ | Conversation history |
| `POST` | `/api/search/` | ✓ | Semantic clause search |
| `GET` | `/api/stats/` | ✓ | Portfolio analytics |
| `GET` | `/api/health` | — | Health check |

---

## Data Model

```
User (1) ──── (N) Contract
                    │
                    ├── original_filename, file_type
                    ├── extracted_text
                    ├── overall_risk_score (0.0–1.0)
                    ├── risk_level (critical|high|medium|low)
                    ├── title, contract_type, governing_law
                    ├── parties (JSONB)
                    ├── effective_date, expiration_date
                    ├── summary (AI-generated)
                    │
                    ├── (N) Clause
                    │       ├── clause_text
                    │       ├── section_heading
                    │       ├── clause_type (25-category taxonomy)
                    │       ├── risk_score, risk_level
                    │       ├── explanation, suggestion
                    │       ├── embedding (VECTOR 1536) ← pgvector
                    │       └── metadata_ (JSONB)
                    │               ├── confidence
                    │               ├── market_comparison
                    │               ├── impact_if_triggered
                    │               ├── clause_type_detail
                    │               └── legal_grounding
                    │                       ├── provider: "TrustFoundry"
                    │                       ├── verified: true
                    │                       └── citations[]: [{citation, summary, source_url}]
                    │
                    └── (N) ChatMessage
                            ├── role (user|assistant)
                            └── content
```

---

## AI Clause Taxonomy

ClauseGuard classifies every clause into one of **25 categories** drawn from the CUAD dataset and Kira smart fields:

`change_of_control` · `termination_convenience` · `termination_cause` · `indemnification` · `limitation_of_liability` · `non_compete` · `non_solicitation` · `ip_ownership` · `assignment` · `exclusivity` · `most_favored_nation` · `confidentiality` · `data_privacy` · `insurance` · `audit_rights` · `warranty` · `force_majeure` · `governing_law` · `dispute_resolution` · `notice` · `survival` · `payment_terms` · `auto_renewal` · `sla` · `general`

Each clause analysis returns:
- **risk_score** — 0.0 to 1.0 quantified severity
- **risk_level** — critical / high / medium / low
- **explanation** — what the clause does and why it matters
- **market_comparison** — *"This 7-day window is well below the 30-day SaaS industry standard"*
- **impact_if_triggered** — *"Unlimited indemnification; no cap; no reciprocity. Worst-case: $10M+ exposure"*
- **suggestion** — specific redline language to request in negotiations
- **legal_grounding** — TrustFoundry citations grounding the risk in verified law

---

## TrustFoundry Integration

ClauseGuard uses [TrustFoundry](https://trustfoundry.ai)'s agentic legal search to ground AI risk findings in verified US law.

**How it works:**
1. After GPT-4o scores each clause, high/critical clauses are sent to TrustFoundry's `/public/v1/agentic-search` endpoint
2. The API returns a streaming NDJSON response including a `citations_ready` event
3. ClauseGuard parses verified citations (case names, statute numbers, summaries, URLs)
4. Citations are stored in `clause.metadata_.legal_grounding` and displayed in the review UI

**Example citation:** *"Edwards v. Arthur Andersen LLP (2008) 44 Cal.4th 937 — California Supreme Court held that non-compete agreements are void under Bus. & Prof. Code § 16600 absent narrow statutory exceptions."*

---

## Competitive Positioning

| | ClauseGuard | Harvey AI | Spellbook | Kira |
|--|-------------|-----------|-----------|------|
| Visual risk heatmap | ✅ | ❌ | ❌ | ❌ |
| Verified legal citations | ✅ TrustFoundry | ✅ LexisNexis | ❌ | ❌ |
| Instant / zero onboarding | ✅ | ❌ | ❌ | ❌ |
| RAG-grounded chat | ✅ | ✅ | ❌ | ❌ |
| Market benchmarking | ✅ | ❌ | ✅ | ✅ |
| Portfolio analytics | ✅ | ✅ | ❌ | ✅ |
| Open source | ✅ | ❌ | ❌ | ❌ |
| Startup-accessible pricing | ✅ | ❌ | ✅ | ❌ |

---

## Built At

**LLM × Law Hackathon #6**
Stanford Law School — CodeX (Stanford Center for Legal Informatics)
**April 12, 2026**

> *"ClauseGuard was built in a single hackathon sprint to demonstrate that AI-powered contract intelligence doesn't have to cost $100K/year. Every law firm — from boutique practices to global M&A teams — deserves to see risk before it sees them."*

### Team

**Brian** — Founder, Digital Studio Labs · AI-native web application engineer

---

## License

MIT — see [LICENSE](LICENSE) for details.
