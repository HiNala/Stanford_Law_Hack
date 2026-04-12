# ClauseGuard — Demo Script

> LLM x Law Hackathon #6 · Stanford Law School · April 12, 2026  
> Total runtime: **2–3 minutes**

---

## Before You Present

**Setup checklist (do this 5 minutes before):**

1. `docker compose up --build` is running — all three services healthy
2. Browser open to `http://localhost:3000` in **incognito/private mode**
3. Network tab is open (to show real API calls if asked by a technical judge)
4. The `Vendor Services Agreement` contract is already analyzed (seed script ran)
5. Have a sample PDF ready for the live upload demo (use `backend/sample_contracts/acme_vendor_msa.txt` renamed to `.pdf` or keep as `.txt`)

**Fallback plan:**
- If OpenAI is slow: navigate directly to the pre-seeded Vendor Agreement — the heatmap works entirely from cached data, no live API needed
- If chat is slow: pre-type the question so the stream starts faster
- If the app is down: have a screen recording ready as a backup

---

## The Script

### Act 1 — The Problem (15 seconds)

> *"Law firms spend millions of hours manually reading contracts. When a merger happens, associates sit in a data room for weeks, reading hundreds of agreements line by line, copying risks into spreadsheets, hoping they don't miss anything. They almost always miss something. We built ClauseGuard to fix that."*

**[Show: the login page]**

Click **Try Demo** — one click, no typing.

---

### Act 2 — The Portfolio (10 seconds)

**[Show: the dashboard]**

> *"This is your contract portfolio. Three contracts, each with an overall risk score. Watch what happens when we open the high-risk one."*

Click the **Vendor Services Agreement** (the red/critical one).

---

### Act 3 — The Money Shot (30 seconds)

**[Show: the heatmap lighting up]**

*Pause here. Let the cascading animation play. Let the room take it in.*

> *"In seconds, ClauseGuard has read the entire contract and painted a risk map. Red means critical. Orange means high. Green means safe. You can see immediately that this contract has serious problems."*

Click a **red clause** — the indemnification or termination one.

**[Show: the analysis panel scrolling to that clause's explanation]**

> *"This indemnification clause is unlimited and one-sided — it exposes our client to unbounded liability. Standard market terms cap this at two times annual contract value. ClauseGuard explains exactly why it is risky and suggests specific alternative language to negotiate."*

---

### Act 4 — Chat with the Contract (20 seconds)

**[Show: the chat panel]**

Click one of the example question chips: **"Are there any change-of-control clauses?"** (or type it if chips are not visible)

*Let the response stream in.*

> *"The AI is grounded in the actual contract. It references Section 14.2 specifically. It is not hallucinating — it pulled the relevant clause from our vector database and explained what it means for our client."*

---

### Act 5 — Live Processing (15 seconds)

**[Navigate to Upload]**

> *"New contracts are analyzed in under two minutes. Watch."*

Drag a contract file onto the drop zone. Hit upload.

**[Navigate back to Dashboard]**

> *"It is processing now. Within two minutes, that contract will have a complete risk heatmap, clause-by-clause analysis, and will be searchable across our entire portfolio. What used to take three associates four weeks now takes two minutes per contract."*

---

### Act 6 — The Vision (20 seconds)

**[Optional: navigate to the Summary page for the analyzed contract]**

> *"And we can export a full due diligence memo in one click — formatted like the findings reports partners actually use."*

> *"The next step is a team of specialized AI agents that collaborate on review — a Risk Analyst, a Compliance Officer, a Negotiation Strategist, and a Quality Reviewer working together. Just like a real law firm, but in two minutes instead of four weeks."*

---

### Close (10 seconds)

> *"ClauseGuard. See risk before it sees you."*

---

## Anticipated Judge Questions

**"How is this different from Harvey AI?"**
> Harvey produces text-based findings. We produce a visual heatmap that communicates risk instantly without reading a word. Our heatmap is something Harvey does not have. And we are accessible on day one — no enterprise sales cycle.

**"Why not just use ChatGPT directly?"**
> ChatGPT has no memory of your contracts, no persistent storage, no visual heatmap, no portfolio-level intelligence, and no semantic search across your entire clause database. ClauseGuard is purpose-built infrastructure for legal contract review, not a general-purpose chatbot.

**"How accurate is the AI?"**
> Our risk scoring is benchmarked against the CUAD dataset — 510 real commercial contracts with expert legal annotations across 41 clause categories. The AI is explicitly instructed to compare provisions to market standard terms and flag when it is uncertain.

**"What happens to our confidential contracts?"**
> In production, all contracts are encrypted at rest and in transit. We offer data residency options and are targeting SOC 2 Type II certification. For enterprise, we support dedicated database deployment.

**"Who is your target customer?"**
> Mid-market law firms (10–100 attorneys) doing M&A due diligence and ongoing contract portfolio management. They are too large for manual review to scale and too small for Ironclad's six-month onboarding. We are the product that fits between Spellbook and Luminance — and neither of those has a visual heatmap.

**"What is your go-to-market?"**
> Direct to small/mid-size law firms through content marketing and legal tech communities (ILTA, ABA TECHSHOW). $99/user/month starter tier gets firms running in one day. Network effects accrue as firms build clause history and custom playbooks.

---

## Key Demo Timing

| Segment | Target Time |
|---------|-------------|
| Login → Dashboard | 5 seconds |
| Dashboard → Review (heatmap visible) | 3 seconds |
| Heatmap animation | 5 seconds (let it breathe) |
| Click clause → explanation | 3 seconds |
| Type + send chat message | 8 seconds |
| Chat response streams | 5–10 seconds |
| Upload + show processing | 10 seconds |
| Close statement | 10 seconds |
| **Total** | **~60 seconds active demo + breathing room = ~2 minutes** |
