# 🛡️ ClauseGuard — AI-Powered Contract Intelligence

> **See risk before it sees you.**

Built at the **Stanford LLM × Law Hackathon #6** — Stanford Center for Legal Informatics (CodeX), April 12, 2026.

ClauseGuard transforms how legal teams review contracts. Upload a PDF, DOCX, or TXT contract and get instant AI-powered risk analysis with a visual heatmap, attorney-grade clause explanations, and a conversational AI copilot — all in one elegant interface.

---

## The Problem

Manual contract review is slow, expensive, and error-prone. A single missed clause — an uncapped indemnification, a 7-day auto-renewal window, a one-sided change-of-control trigger — can cost a company millions. Junior associates spend hours on low-value extraction tasks. Partners don't have time to review every clause themselves.

**For small and mid-sized law firms, enterprise contract intelligence tools like Harvey AI ($11B) and Kira are priced out of reach.**

## The Solution

ClauseGuard provides enterprise-grade contract intelligence at startup speed:

- **Visual Risk Heatmap** — every clause color-coded red/amber/green by risk severity. The heatmap cascades on load, drawing the eye to critical provisions instantly.
- **Market-Benchmarked Analysis** — each clause is compared to market standard. "This 7-day cancellation window is well below the 30-day standard for SaaS agreements."
- **Impact Assessment** — practical worst-case scenarios, quantified. "Unlimited indemnification exposure with no cap."
- **Senior Associate AI Voice** — the AI reasons like a $800/hour partner, not a chatbot. It cites section numbers, references specific language, and suggests redlines.
- **RAG Chat** — ask natural language questions grounded in the actual contract text.
- **Due Diligence Memos** — one-click generation of attorney-format reports with Critical Findings, Material Findings, and Recommended Next Steps separated.

## Key Features

| Feature | Description |
|---------|-------------|
| 🔴 Risk Heatmap | Color-coded clause-level risk overlay with cascade animation |
| 📊 Market Benchmarking | Compares each clause to market standard norms |
| 💥 Impact Scoring | Quantifies worst-case exposure if clauses are triggered |
| 💬 RAG Chat | AI answers grounded in the actual contract text |
| 📋 Due Diligence Memos | Attorney-format reports: Critical → Material → Next Steps |
| 🔍 Semantic Search | Find similar clauses across your entire portfolio |
| 📈 Portfolio Analytics | Risk distribution, average score, highest-risk contract |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Docker Compose                    │
│                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │  Frontend   │  │   Backend    │  │  Database  │  │
│  │  Next.js 16 │  │  FastAPI     │  │ PostgreSQL │  │
│  │  TypeScript │→ │  Python 3.11 │→ │    17 +   │  │
│  │  Tailwind 4 │  │  SQLAlchemy  │  │  pgvector  │  │
│  │  Port 3000  │  │  Port 8000   │  │  Port 5432 │  │
│  └─────────────┘  └──────────────┘  └────────────┘  │
│                          │                          │
│                   ┌──────┴──────┐                   │
│                   │   OpenAI    │                   │
│                   │   GPT-4o    │                   │
│                   │  Embed-3-sm │                   │
│                   └─────────────┘                   │
└─────────────────────────────────────────────────────┘
```

**Processing Pipeline:**
```
Upload → Extract Text → Chunk Clauses → Generate Embeddings (pgvector)
      → Risk Analysis (GPT-4o) → Market Benchmarking → Metadata Extraction
      → Visual Heatmap
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS v4, Framer Motion, Zustand |
| **Backend** | Python 3.11, FastAPI, SQLAlchemy (async), Pydantic v2 |
| **Database** | PostgreSQL 17 + pgvector (1536-dim cosine similarity) |
| **AI** | OpenAI GPT-4o (analysis, chat, summaries), text-embedding-3-small (RAG) |
| **Infrastructure** | Docker Compose, JWT authentication |

## Quick Start

### Prerequisites
- Docker & Docker Compose
- OpenAI API key

### Setup

```bash
# Clone
git clone https://github.com/HiNala/Stanford_Law_Hack.git
cd Stanford_Law_Hack

# Create environment file
cp .env.example .env
# ⚠️  Edit .env and set OPENAI_API_KEY=sk-...

# Build and launch (includes auto-seeding with demo contracts)
docker compose up --build
```

On first launch, the backend automatically:
1. Creates all database tables
2. Seeds a demo user (`demo@clauseguard.ai` / `hackathon2026`)
3. Uploads and fully analyzes 3 demo contracts (requires OpenAI API key)

**Access:**
- Frontend: http://localhost:3000
- API Docs: http://localhost:8000/docs
- Health check: http://localhost:8000/api/health

### Demo Login

Click **"Try Demo Login"** on the login page, or use:
- Email: `demo@clauseguard.ai`
- Password: `hackathon2026`

### Re-seed Demo Data

If you need to reload the demo contracts (e.g., after `docker compose down -v`):

```bash
docker exec clauseguard-backend python -m app.seed
```

## Demo Script

For hackathon presentations, follow this flow:

1. **Open** http://localhost:3000 → click **"Try Demo Login"**
2. **Dashboard** → 3 pre-analyzed contracts with red/orange/green risk badges
3. **Click the Acme MSA** (critical risk) → watch the heatmap cascade
4. **Point to a red clause** → click it → the analysis panel shows market comparison and impact assessment
5. **Switch to Chat AI** → ask: *"Is the indemnification mutual or one-sided?"*
6. **Watch streaming response** → AI cites Section 6.1, explains uncapped exposure, suggests redline
7. **Click Report** → generate a due diligence memo with Critical Findings and Next Steps
8. **Return to Dashboard** → upload a new contract live → show real-time analysis animation

**Talking points:**
- Harvey AI has no visual heatmap. Our cascading heatmap is a visual differentiator.
- Spellbook requires Microsoft Word. We're web-native and instant.
- Our AI reasons at senior associate level — with market benchmarks, not just flag/no-flag.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login → JWT |
| GET | `/api/auth/me` | Current user |
| POST | `/api/contracts/upload` | Upload contract |
| GET | `/api/contracts/` | List contracts |
| GET | `/api/contracts/{id}` | Contract detail |
| DELETE | `/api/contracts/{id}` | Delete contract |
| GET | `/api/contracts/{id}/status` | Processing status |
| GET | `/api/clauses/{id}` | All clauses for contract |
| GET | `/api/clauses/{id}/summary` | Risk distribution |
| POST | `/api/chat/{id}` | Chat with contract (SSE) |
| GET | `/api/chat/{id}/history` | Chat history |
| POST | `/api/search/` | Semantic search |
| POST | `/api/analysis/{id}/report` | Generate due diligence report |
| GET | `/api/analysis/{id}/status` | Analysis status |
| GET | `/api/stats/` | Portfolio statistics |
| GET | `/api/health` | Health check |

## AI Intelligence

ClauseGuard uses a **25-category clause taxonomy** inspired by the CUAD dataset and Kira smart fields:

`change_of_control` · `termination_convenience` · `termination_cause` · `indemnification` · `limitation_of_liability` · `non_compete` · `non_solicitation` · `ip_ownership` · `assignment` · `exclusivity` · `most_favored_nation` · `confidentiality` · `data_privacy` · `insurance` · `audit_rights` · `warranty` · `force_majeure` · `governing_law` · `dispute_resolution` · `notice` · `survival` · `payment_terms` · `auto_renewal` · `sla` · `general`

Each clause analysis includes:
- `risk_score` (0.0–1.0)
- `explanation` — what the clause does and why it matters
- `market_comparison` — how it compares to market standard
- `impact_if_triggered` — quantified worst-case exposure
- `suggestion` — specific redline language to request

## Demo Contracts

Three pre-built demo contracts are included in `backend/sample_contracts/`:

| Contract | Risk Profile | Notable Issues |
|----------|-------------|----------------|
| Acme Corp MSA | 🔴 Critical | Uncapped indemnification, 15-day termination, 36-month non-compete, one-sided IP assignment |
| InnovateTech/Meridian NDA | 🟢 Low/Medium | Standard mutual NDA with reasonable terms — good contrast demo |
| CloudStack SaaS Agreement | 🟠 High | 7-day auto-renewal, perpetual data license, $100 liability cap |

## Future Roadmap

- **Custom Playbooks** — firm-specific review standards that adapt to institutional preferences
- **Clause Benchmarking** — percentile rankings against market data
- **Portfolio Analysis** — cross-contract pattern detection ("14 of 52 contracts have change-of-control triggers")
- **Regulatory Monitoring** — proactive alerts when new laws affect your portfolio
- **Word Plugin** — analysis inside Microsoft Word
- **Multi-user Teams** — role-based access (Partner, Associate, Paralegal)

## Competitive Positioning

| | ClauseGuard | Harvey AI | Spellbook | Kira |
|--|-------------|-----------|-----------|------|
| Visual heatmap | ✅ | ❌ | ❌ | ❌ |
| Instant (no onboarding) | ✅ | ❌ | ❌ | ❌ |
| Web-native | ✅ | ✅ | ❌ | ❌ |
| Market benchmarking | ✅ | ❌ | ✅ | ✅ |
| Portfolio analytics | ✅ | ✅ | ❌ | ✅ |
| Open pricing | ✅ | ❌ | ✅ | ❌ |

## Team

Built at Stanford Law School for the LLM × Law Hackathon #6.

**Brian** — Founder, Digital Studio Labs

## License

MIT
