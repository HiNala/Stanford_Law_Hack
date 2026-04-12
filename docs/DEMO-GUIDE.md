# ClauseGuard — Complete Demo Guide
**LLM × Law Hackathon #6 · Stanford Law School · April 2026**

---

## The Story You're Telling

> **Meridian Holdings, a mid-size technology company, is being acquired by AcquiTech Capital Partners.** The deal team has 72 hours to review four key contracts — their vendor MSA, SaaS infrastructure agreement, a new mutual NDA, and their CTO's employment contract. They just uploaded everything to ClauseGuard. You're showing the acquirer's counsel what they found.

This story hits every investor and judge present: M&A due diligence is a $50B/year pain point. Every deal goes through this. Before ClauseGuard, a team of associates spent 40-80 hours on this exact task.

---

## Before You Demo — Setup Checklist

- [ ] `docker compose up` is running — verify `http://localhost:3000` loads
- [ ] Click "Try Demo Login" — confirm 4 contracts appear on the dashboard
- [ ] `cloud_ai_services_agreement.txt` is on your Desktop or Downloads folder (this is your live upload)
- [ ] Browser is Chrome, zoom at 100%, incognito mode (clean session, no extensions)
- [ ] Presenter mode: laptop connected to display, maximize browser window
- [ ] Silence your phone

---

## Demo Walkthrough — 3 Minutes Total

---

### ACT 1: The Setup (30 seconds)

**Screen:** Login page

**What you say:**
> "Meridian Holdings is being acquired. Their counsel just uploaded four contracts to ClauseGuard — let me show you what our AI found in the time it took to pour coffee."

**Action:** Click "Try Demo Login"

**What you say as the dashboard loads:**
> "ClauseGuard connects to TrustFoundry's legal database — 14 million US laws and cases — so every finding is backed by an actual statute, not an AI hallucination."

**Screen:** Dashboard with 4 contract cards

**Point out:**
- The color-coded risk scores — red, orange, yellow, green — one glance tells the story
- "This is the acquisition target's entire relevant contract portfolio. One screen."

---

### ACT 2: The Money Shot — Critical Contract (60 seconds)

**Action:** Click the **Vendor Master Services Agreement — GlobalSupply Partners** card (CRITICAL · 91%)

**Screen:** Review page loading

**What you say:**
> "This is the vendor MSA. GlobalSupply runs 40% of Meridian's supply chain. Let me show you what our AI found."

**Watch the heatmap cascade in** — pause here for 3-4 seconds, let the colors speak.

> "You can see the risk heatmap lighting up. Red means critical — these are provisions that can kill this deal."

**Click on Section 9 — Indemnification** (first critical clause, bright red)

**Right panel shows the analysis. Point to:**
1. The risk badge ("CRITICAL")
2. The explanation (unlimited one-sided indemnification)
3. The **"Verified by TrustFoundry" green badge** with the citation
4. The suggested alternative

**What you say:**
> "Section 9 is a deal-breaker. Meridian bears unlimited indemnification exposure — including third-party claims from Meridian's entire industry — while GlobalSupply has zero liability. Our AI flagged this AND found the controlling New York statute. That's not GPT-4 guessing — that's N.Y. Gen. Oblig. Law § 5-322.1, verified against TrustFoundry's database."

**Click on Section 12.3 — Change of Control**

**What you say:**
> "Here's the acquisition killer. GlobalSupply has a five-day change-of-control exit right. The moment this deal closes, they can walk. That's 40% of the supply chain, gone in five days. No acquirer can close on these terms."

---

### ACT 3: AI Chat (30 seconds)

**Click the "Chat" tab**

**Type (or click the example chip):**
> "What happens to this contract if AcquiTech acquires Meridian Holdings?"

**Watch the streaming AI response.** Don't narrate — let the response speak.

**After it finishes:**
> "The AI doesn't just answer — it cites the specific clause language and the legal standard. That's the difference between a chatbot and a legal assistant."

---

### ACT 4: Portfolio Intelligence (30 seconds)

**Click the back arrow → Dashboard → "Portfolio Report" button**

**Screen:** Portfolio report page

**Point to:**
- Contract triage (red/orange/green cards)
- Priority action items list
- The TrustFoundry verification count
- Cross-contract patterns section

**What you say:**
> "This is the partner-level view. Four contracts, 21 clauses reviewed, priority action items sorted by severity with effort estimates and attorney level assignments. A partner looks at this for 90 seconds and knows exactly what to tell their associates. This is what used to take a team 40 hours."

---

### ACT 5: Live Upload — The Wow Moment (45 seconds)

**Go back to Dashboard → click "Upload Contract"**

**What you say:**
> "Now let me show you something live. This morning, Meridian's general counsel forwarded a contract from their AI vendor — Axiom AI Technologies. They want to sign it before the deal closes. Let me run it right now."

**Drag and drop `cloud_ai_services_agreement.txt`**

**While it processes (60-90 seconds), narrate:**
> "Our pipeline extracts the text, chunks it into semantic sections, generates embeddings, runs GPT-4o risk analysis on every clause, then cross-references against TrustFoundry's legal database for verified citations. All of that happening right now."

**When it appears as "Analyzed" — click it**

**Heatmap lights up. Point to:**
- Sections 8 and 9 are critical red
- Section 5.2 (perpetual data license) is red
- Section 3.2 (termination fee) is high orange

**What you say:**
> "There it is. ClauseGuard flagged Section 8 — unlimited one-sided indemnification. Section 5.2 — they want a perpetual, irrevocable license to train their AI on everything Hartwell & Morrison submits. Including attorney-client privileged documents. And Section 9 — their liability cap is literally $500. For a $30,000-per-year contract. **We just saved this firm from a catastrophic error in under two minutes.**"

---

## Demo Conclusion (10 seconds)

> "ClauseGuard turns a 40-hour due diligence sprint into a 2-minute AI review. Every finding grounded in real law, not hallucinations. Built for small and mid-size firms who can't afford Harvey's pricing — or the risk of signing the wrong contract."

---

## Where to Get Your Demo Contracts

### Pre-Loaded (No Action Needed)
These 4 contracts are automatically seeded when Docker starts:

| Contract | Risk | Story |
|----------|------|-------|
| Vendor MSA — GlobalSupply Partners | **CRITICAL 91%** | Change-of-control exit, unlimited indemnification |
| Master SaaS Agreement — TechCo LLC | **HIGH 79%** | $1,000 liability cap, one-sided indemnification, 7-day renewal window |
| NDA — Acme Technologies | **MEDIUM 48%** | Overbroad IP assignment hidden in an NDA |
| Employment Agreement — Pinnacle Dynamics | **LOW 32%** | Texas non-compete, IP assignment (both moderate) |

### Live Upload Contract (Drama)
**File:** `backend/sample_contracts/cloud_ai_services_agreement.txt`

Copy this to your Desktop before demoing. This is your live upload moment.

**Why this contract is perfect for live demo:**
- Section 8: Unlimited client indemnification, zero vendor obligations
- Section 9: Liability cap = `min(1 month fees, $500)` — literally $500
- Section 5.2: Perpetual irrevocable license to train AI on attorney-client privileged data
- Section 3.2: 75% termination fee for early exit + all setup costs
- Section 3.1: 7-day auto-renewal window for annual contract
- Section 6.4: Confidentiality obligations last 10 years
- Section 10.5: Explicit privilege waiver warning (attorneys will gasp)
- Section 11.2: Mandatory arbitration + class action waiver

**Expected result:** CRITICAL risk score (85-95%), multiple red clauses, TrustFoundry citations on indemnification and data privacy sections.

### Getting Real Contracts (Stretch Goal — Post-Hackathon)
For production demos with real contracts:
- **CUAD Dataset** (free): `huggingface.co/datasets/theatticusproject/cuad-qa` — 510 real SEC-filed contracts with expert annotations
- **SEC EDGAR**: Any 10-K filing's Exhibit 10 attachments are material contracts (public domain)
- Example: Search `EDGAR EFTS` for "master services agreement" filings from tech companies

---

## Anticipated Judge Questions & Sharp Answers

### "How is this different from ChatGPT?"

> "ChatGPT makes up legal citations — that's well-documented. ClauseGuard integrates with TrustFoundry, which covers 14 million verified US laws and cases. When we cite Cal. Bus. & Prof. Code § 16600, we're pulling that from a verified legal database, not from GPT's training memory. We also have a purpose-built risk taxonomy with 25 clause categories trained on the CUAD dataset — 510 real SEC-filed contracts. It's not a chatbot. It's a legal analysis engine."

### "How is this different from Harvey AI?"

> "Harvey is $30K+/year, enterprise-only, requires onboarding, and produces text reports. We produce visual heatmaps that communicate risk in 10 seconds. Harvey has no portfolio view. Harvey has no real-time upload analysis. And Harvey is built for AmLaw 100 firms. We're built for the 95% of law firms — solo practitioners, boutiques, in-house counsel — who can't afford Harvey and shouldn't have to."

### "What's the go-to-market?"

> "Month 1: Individual attorneys at $99/month. Month 6: Firm-level seats with portfolio analytics. Year 2: API for legal software companies to embed our risk engine. We're Blue Ocean — nobody else is doing portfolio-level visual risk intelligence for the mid-market. Spellbook is single-document, Word-native. We're web-native, multi-document, with deal-level intelligence."

### "Is the AI actually accurate?"

> "For the pre-loaded demo data, yes — it was trained and verified by our team. For live uploads, accuracy depends on the quality of the contract text extraction and the AI's analysis. We show confidence scores on every finding and always recommend attorney review. We augment legal judgment — we don't replace it. That's an important positioning choice for the market too: attorneys trust tools that are honest about their limitations."

### "What does TrustFoundry integration actually give you?"

> "Instead of GPT-4o saying 'this non-compete might be unenforceable in California,' we say 'Cal. Bus. & Prof. Code § 16600 voids this clause — here's the statute, here's the link, and here's how Edwards v. Arthur Andersen LLP applied it in 2008.' That's the difference between a hallucination and a citation. For attorneys, that's the difference between a tool they'll use and a liability."

### "What would it cost to actually build this?"

> "OpenAI API costs are roughly $0.05-0.15 per contract for analysis. TrustFoundry is a fixed infrastructure cost. Storage is minimal. At $99/month per attorney, even 10 active users covers infrastructure costs. Unit economics work immediately at small scale."

### "Pear VC: What's the market size?"

> "The US legal market is $370 billion annually. Contract review and due diligence is estimated at $20-40 billion. The mid-market segment — firms too small for Harvey, too large to ignore legal tech — has no dominant solution. That's our beach head. 430,000 active attorneys in the US. At $99/month, 1% penetration is $500M ARR."

---

## Fallback Plan (If Something Goes Wrong)

### If Docker is down:
Take screenshots of the review page and portfolio report before your demo. Walk through screenshots if needed. The screenshots tell the story.

### If OpenAI API is slow:
The 4 pre-loaded contracts are fully analyzed and require ZERO API calls to display. The dashboard, review page, heatmap, and portfolio report all work instantly from cached data. Only the live upload and chat require live API calls.

### If the live upload takes too long:
Click to a different pre-loaded contract while you wait. The audience doesn't know which contract you're navigating to.

### If the chat is slow:
Show the analysis panel instead. The pre-analyzed clauses have deep explanations. "The AI already analyzed all 21 clauses and let me show you what it found on this one..."

---

## The One-Sentence Pitch

> "ClauseGuard is the AI-powered contract intelligence platform that tells attorneys exactly which clauses will kill their deal, why they're dangerous under the law, and exactly what language to demand instead — in under two minutes."

---

## Key Numbers to Memorize

- **4 contracts, 21 clauses** — the pre-loaded portfolio
- **91%** — the GlobalSupply MSA risk score (the headline number)
- **$500** — TechCo's liability cap on a $30K/year contract (the absurd number that gets laughs)
- **14 million** — TrustFoundry's legal database coverage
- **40 hours vs. 2 minutes** — the time comparison
- **5 days** — the change-of-control notice period that would let GlobalSupply exit the acquisition

---

*Built at LLM × Law Hackathon #6 · Stanford Law School · April 2026*
*Team: ClauseGuard*
