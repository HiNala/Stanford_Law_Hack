"""
Demo seed script — creates a demo user and pre-analyzed contracts for the hackathon demo.

Usage (run inside the backend container):
    docker compose exec backend python seed.py

Or locally with DATABASE_URL pointing to localhost:
    DATABASE_URL=postgresql+asyncpg://clauseguard:clauseguard@localhost:5432/clauseguard python seed.py
"""

import asyncio
import os
import sys
import uuid
from datetime import date

sys.path.insert(0, os.path.dirname(__file__))

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://clauseguard:clauseguard@localhost:5432/clauseguard",
)

DEMO_EMAIL = "demo@clauseguard.ai"
DEMO_PASSWORD = "demo1234"
DEMO_NAME = "Demo Attorney"


def _read_sample(filename: str) -> str | None:
    """Read a sample contract file from the sample_contracts directory."""
    here = os.path.dirname(__file__)
    path = os.path.join(here, "sample_contracts", filename)
    try:
        with open(path, encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return None


async def seed():  # noqa: C901
    from sqlalchemy import select
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

    from app.models.user import User
    from app.models.contract import Contract
    from app.models.clause import Clause
    from app.database import Base
    from app.services.auth_service import hash_password

    engine = create_async_engine(DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_factory() as db:
        # Create or retrieve demo user
        result = await db.execute(select(User).where(User.email == DEMO_EMAIL))
        user = result.scalar_one_or_none()

        if not user:
            user = User(
                email=DEMO_EMAIL,
                password_hash=hash_password(DEMO_PASSWORD),
                full_name=DEMO_NAME,
            )
            db.add(user)
            await db.flush()
            print(f"✓ Created demo user: {DEMO_EMAIL} / {DEMO_PASSWORD}")
        else:
            print(f"• Demo user already exists: {DEMO_EMAIL}")

        # Check which demo contracts are missing
        result = await db.execute(select(Contract).where(Contract.user_id == user.id))
        existing = list(result.scalars().all())
        existing_titles = {c.title for c in existing}

        NDA_TITLE = "Mutual Non-Disclosure Agreement — Acme Technologies"
        SAAS_TITLE = "Master SaaS Agreement — TechCo LLC"
        MSA_TITLE = "Vendor Master Services Agreement — GlobalSupply Partners"
        EMP_TITLE = "Executive Employment Agreement — Pinnacle Dynamics"

        need_nda = NDA_TITLE not in existing_titles
        need_saas = SAAS_TITLE not in existing_titles
        need_msa = MSA_TITLE not in existing_titles
        need_emp = EMP_TITLE not in existing_titles

        if not need_nda and not need_saas and not need_msa and not need_emp:
            print("• All 4 demo contracts already seeded. Skipping.")
            await db.commit()
            return

        missing = [t for t, v in [(NDA_TITLE, need_nda), (SAAS_TITLE, need_saas), (MSA_TITLE, need_msa), (EMP_TITLE, need_emp)] if v]
        print(f"• Adding {len(missing)} missing contract(s): {', '.join(missing)}")

        # ── Contract 1: Mutual NDA ─────────────────────────────────────────────
        _nda_text = _read_sample("techcorp_mutual_nda.txt")
        nda = Contract(
            user_id=user.id,
            filename="demo_nda_acme.txt",
            original_filename="NDA — Acme Technologies.txt",
            file_path="/app/uploads/demo_nda_acme.txt",
            file_type="txt",
            file_size_bytes=5800,
            title="Mutual Non-Disclosure Agreement — Acme Technologies",
            parties={"names": ["Acme Technologies, Inc.", "Vertex Legal Solutions, LLC"]},
            effective_date=date(2026, 1, 15),
            expiration_date=date(2029, 1, 15),
            governing_law="California",
            contract_type="NDA",
            overall_risk_score=0.48,
            risk_level="medium",
            status="analyzed",
            raw_text=_nda_text,
            summary=(
                "This Mutual NDA between Acme Technologies and Vertex Legal Solutions governs "
                "the exchange of confidential information for an AI-legal workflow integration "
                "partnership. The agreement has a 3-year term with a 5-year post-termination "
                "confidentiality obligation — above market standard. Two clauses require "
                "immediate attention before execution: Section 5.2 contains a one-sided IP "
                "assignment clause that could transfer ownership of any derivative work to the "
                "other party, and Section 7 provides injunctive relief without requiring actual "
                "damages or bond. Combined, these provisions create meaningful litigation "
                "exposure. Recommend negotiating both before signing."
            ),
        )
        if need_nda:
            db.add(nda)
            await db.flush()

        nda_clauses = [
            {
                "clause_index": 0,
                "section_heading": "Section 1 — Purpose",
                "clause_text": (
                    "The Parties wish to explore a potential business relationship concerning the "
                    "integration of artificial intelligence tools into legal workflow systems (the "
                    "\"Purpose\"). In connection with the Purpose, each Party may disclose to the "
                    "other certain confidential and proprietary information."
                ),
                "clause_type": "general",
                "risk_score": 0.08,
                "risk_level": "low",
                "risk_category": "general",
                "explanation": (
                    "Standard purpose clause with a narrowly defined scope limited to AI-legal "
                    "workflow integration. The defined Purpose is specific and creates bounded "
                    "obligations — neither party can use information disclosed under this NDA "
                    "for any purpose beyond what is stated here.\n\n"
                    "**Market context:** This is standard NDA language. Purpose clauses this "
                    "specific are preferred because they limit the scope of permissible use."
                ),
                "suggestion": None,
            },
            {
                "clause_index": 1,
                "section_heading": "Section 3.1 — Confidentiality Obligations",
                "clause_text": (
                    "The receiving Party shall: (a) hold the Confidential Information in strict "
                    "confidence; (b) not disclose the Confidential Information to any third party "
                    "without the prior written consent of the disclosing Party; (c) use the "
                    "Confidential Information solely for the Purpose; and (d) protect the "
                    "Confidential Information using the same degree of care it uses to protect its "
                    "own confidential information, but in no event less than reasonable care."
                ),
                "clause_type": "confidentiality",
                "risk_score": 0.18,
                "risk_level": "low",
                "risk_category": "confidentiality",
                "explanation": (
                    "Standard mutual confidentiality obligations with a reasonable care standard. "
                    "The \"same degree of care\" plus \"no less than reasonable care\" floor is "
                    "the market-standard formulation — it is neither one-sided nor unusually "
                    "burdensome.\n\n"
                    "**Market context:** This tracks boilerplate MNDA language. Both parties "
                    "bear symmetric obligations, which is correct for a mutual NDA."
                ),
                "suggestion": None,
            },
            {
                "clause_index": 2,
                "section_heading": "Section 5.2 — IP Ownership",
                "clause_text": (
                    "Any inventions, improvements, or derivative works created by either Party "
                    "using the other Party's Confidential Information shall be the sole and "
                    "exclusive property of the disclosing Party, and the receiving Party hereby "
                    "assigns all right, title, and interest in and to such inventions, "
                    "improvements, or derivative works to the disclosing Party."
                ),
                "clause_type": "ip_ownership",
                "risk_score": 0.82,
                "risk_level": "high",
                "risk_category": "ip_assignment",
                "metadata_": {
                    "confidence": 0.88,
                    "legal_grounding": {
                        "source": "trustfoundry_cached",
                        "verified": True,
                        "citations": [
                            {
                                "citation": "Cal. Labor Code § 2870",
                                "summary": "An employment agreement may not require an employee to assign inventions developed entirely on their own time without company resources, unless the invention relates to the employer's business. Broadly scoped IP assignments risk running afoul of this section.",
                                "source_url": "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=2870&lawCode=LAB",
                                "verified": True,
                            },
                            {
                                "citation": "17 U.S.C. § 101 (Work Made for Hire)",
                                "summary": "Outside employment, work-for-hire requires both a signed written agreement and the work must fall within one of nine enumerated categories. IP assignment clauses that are triggered by mere 'use' of confidential information exceed the traditional work-for-hire doctrine.",
                                "source_url": "https://www.copyright.gov/title17/92chap1.html#101",
                                "verified": True,
                            },
                        ],
                        "provider": "TrustFoundry",
                    },
                },
                "explanation": (
                    "This IP assignment is dangerously overbroad. It requires the receiving "
                    "party to assign ownership of **any invention** created while merely "
                    "\"using\" the disclosing party's information — even if the connection "
                    "is incidental or the invention is primarily the receiving party's work "
                    "product. This could transfer core R&D output to the counterparty.\n\n"
                    "**Market context:** Standard NDAs do not contain IP assignment provisions "
                    "at all — those belong in collaboration or IP licensing agreements. Where "
                    "IP assignment does appear in an NDA, it is typically limited to work "
                    "product that *could not have been created* without the other party's "
                    "confidential information.\n\n"
                    "**If triggered:** Your client could lose ownership of any software, "
                    "algorithm, or product feature developed during the exploration period "
                    "that touched Acme's information in any way."
                ),
                "suggestion": (
                    "Delete this clause entirely if possible — IP assignment has no place in "
                    "a mutual NDA. If the other party insists on retaining it, narrow to: "
                    "\"Any invention that *directly incorporates and could not be created "
                    "without* the disclosing Party's Confidential Information shall be jointly "
                    "owned, subject to a separate written IP agreement.\" Do not accept an "
                    "outright assignment without separate negotiation and consideration."
                ),
            },
            {
                "clause_index": 3,
                "section_heading": "Section 6.2 — Survival of Confidentiality",
                "clause_text": (
                    "The obligations of confidentiality set forth in this Agreement shall survive "
                    "termination for a period of five (5) years from the date of termination."
                ),
                "clause_type": "survival",
                "risk_score": 0.38,
                "risk_level": "medium",
                "risk_category": "confidentiality",
                "explanation": (
                    "A 5-year post-termination survival period is above market standard for "
                    "general confidential information. The 3-year main term plus 5-year tail "
                    "means obligations could run for 8 years total.\n\n"
                    "**Market context:** 2-3 years post-termination is standard for general "
                    "confidential information in commercial NDAs. Trade secrets typically "
                    "receive perpetual protection, but that should be carved out separately "
                    "rather than applied to all information.\n\n"
                    "**If triggered:** Your client bears compliance costs and litigation risk "
                    "for 5 years after the relationship ends, even if the information has "
                    "become publicly available or commercially irrelevant."
                ),
                "suggestion": (
                    "Propose: \"2 years from the date of termination for general Confidential "
                    "Information; perpetual for information that qualifies as a trade secret "
                    "under applicable law.\" This is the market-standard structure and protects "
                    "genuinely sensitive information without burdening both parties indefinitely."
                ),
            },
            {
                "clause_index": 4,
                "section_heading": "Section 7 — Remedies",
                "clause_text": (
                    "The Parties acknowledge that any breach of this Agreement may cause "
                    "irreparable harm to the disclosing Party for which monetary damages would "
                    "be an inadequate remedy. Accordingly, the disclosing Party shall be entitled "
                    "to seek equitable relief, including injunction and specific performance, in "
                    "addition to all other remedies available at law or in equity, without the "
                    "necessity of proving actual damages or posting any bond or other security."
                ),
                "clause_type": "dispute_resolution",
                "risk_score": 0.45,
                "risk_level": "medium",
                "risk_category": "liability",
                "explanation": (
                    "This clause pre-admits that any breach causes irreparable harm and waives "
                    "the requirement to prove actual damages or post a bond before obtaining an "
                    "injunction. While common in NDAs, it creates a significant litigation "
                    "advantage for whoever claims breach first.\n\n"
                    "**Market context:** This language appears in most commercial NDAs and is "
                    "generally accepted. However, combined with the broad IP assignment in "
                    "Section 5.2, it means the other party can seek an emergency injunction "
                    "against your client based on a very low evidentiary threshold.\n\n"
                    "**If triggered:** Counterparty can seek a TRO within days, potentially "
                    "halting product development, without needing to prove concrete damages."
                ),
                "suggestion": (
                    "If you cannot remove the IP assignment clause, add: \"Notwithstanding the "
                    "foregoing, the right to seek injunctive relief shall not be available for "
                    "disputes arising solely from Section 5.2 unless the moving party first "
                    "provides 10 days' written notice and an opportunity to cure.\" This adds "
                    "a minimal procedural brake on abuse of the injunction right."
                ),
            },
            {
                "clause_index": 5,
                "section_heading": "Section 4 — Exclusions from Confidentiality",
                "clause_text": (
                    "The obligations of confidentiality set forth in this Agreement shall not "
                    "apply to information that: (a) is or becomes publicly available through no "
                    "fault of the receiving Party; (b) was already known to the receiving Party "
                    "at the time of disclosure; (c) is independently developed by the receiving "
                    "Party without use of or reference to the Confidential Information; or "
                    "(d) is disclosed to the receiving Party by a third party without restriction "
                    "and without breach of any obligation of confidentiality."
                ),
                "clause_type": "confidentiality",
                "risk_score": 0.08,
                "risk_level": "low",
                "risk_category": "confidentiality",
                "explanation": (
                    "Standard four-part exclusion carve-out. These are the market-standard "
                    "exclusions present in virtually every commercial NDA. Each carve-out is "
                    "narrow and well-defined, and none creates unusual risk for either party.\n\n"
                    "**Market context:** These exclusions are required for a commercially "
                    "reasonable NDA — removing them would make confidentiality obligations "
                    "unreasonably broad. Acceptable as written."
                ),
                "suggestion": None,
            },
            {
                "clause_index": 6,
                "section_heading": "Section 8 — Governing Law",
                "clause_text": (
                    "This Agreement shall be governed by and construed in accordance with the "
                    "laws of the State of California, without regard to its conflict of laws "
                    "provisions. Any dispute not resolved by negotiation shall be submitted to "
                    "binding arbitration in San Francisco, California under the rules of the "
                    "American Arbitration Association."
                ),
                "clause_type": "governing_law",
                "risk_score": 0.15,
                "risk_level": "low",
                "risk_category": "governing_law",
                "explanation": (
                    "California governing law is standard and not unusual for Silicon Valley "
                    "counterparties. The arbitration clause is AAA-standard. No material risk "
                    "in the choice of law provision itself.\n\n"
                    "**Market context:** California courts are sophisticated and well-suited "
                    "for technology IP disputes. Note however that California's choice of law "
                    "means the non-compete and IP assignment provisions in this NDA are subject "
                    "to heightened California scrutiny under Cal. Bus. & Prof. Code § 16600."
                ),
                "suggestion": None,
            },
            {
                "clause_index": 7,
                "section_heading": "Section 9 — Term",
                "clause_text": (
                    "This Agreement shall remain in effect for a period of three (3) years from "
                    "the Effective Date unless earlier terminated by either Party upon thirty "
                    "(30) days' written notice. Either Party may terminate this Agreement at any "
                    "time upon thirty (30) days' prior written notice to the other Party."
                ),
                "clause_type": "termination_convenience",
                "risk_score": 0.12,
                "risk_level": "low",
                "risk_category": "termination",
                "explanation": (
                    "Three-year NDA term with 30-day termination for convenience. Reasonable "
                    "duration for an exploration NDA. The 30-day notice period for convenience "
                    "termination is acceptable and standard.\n\n"
                    "**Market context:** NDAs for business exploration typically run 1-3 years. "
                    "This term is within normal range. Note that Section 6.2's 5-year survival "
                    "period extends obligations well beyond the agreement's base term."
                ),
                "suggestion": None,
            },
        ]

        def _enrich(clauses_list):
            """Add metadata_ with confidence score, preserving any existing legal_grounding."""
            for c in clauses_list:
                score = c.get("risk_score", 0.5)
                conf = 0.92 if score >= 0.7 else 0.88 if score >= 0.4 else 0.95
                existing = c.get("metadata_") or {}
                c["metadata_"] = {**existing, "confidence": existing.get("confidence", conf)}

        _enrich(nda_clauses)
        if need_nda:
            for c in nda_clauses:
                db.add(Clause(contract_id=nda.id, **c))

        # ── Contract 2: Master SaaS Agreement with high risk ──────────────────
        _saas_text = _read_sample("cloudsaas_subscription.txt")
        saas = Contract(
            user_id=user.id,
            filename="demo_saas_techco.txt",
            original_filename="Master SaaS Agreement — TechCo LLC.txt",
            file_path="/app/uploads/demo_saas_techco.txt",
            file_type="txt",
            file_size_bytes=11200,
            title="Master SaaS Agreement — TechCo LLC",
            parties={"names": ["TechCo LLC", "Enterprise Client Corp."]},
            effective_date=date(2025, 6, 1),
            expiration_date=date(2026, 5, 31),
            governing_law="Delaware",
            contract_type="SaaS",
            overall_risk_score=0.79,
            risk_level="high",
            status="analyzed",
            raw_text=_saas_text,
            summary=(
                "This Master SaaS Agreement presents significant commercial risk and should not "
                "be executed without material revisions to at least three provisions. The "
                "indemnification clause (Section 8) is critically one-sided — Enterprise Client "
                "bears unlimited exposure with zero reciprocal protection from TechCo. The "
                "auto-renewal window (Section 11) is 15 days, well below the 60-90 day standard, "
                "creating a contract lock-in trap. TechCo's liability cap (Section 9) is the "
                "greater of 3 months' fees or $1,000 — effectively de minimis for any enterprise "
                "deal. Data privacy provisions (Section 14) lack a DPA, creating GDPR/CCPA "
                "compliance exposure. Recommend refusing to execute until Sections 8, 9, 11, "
                "and 14 are renegotiated."
            ),
        )
        if need_saas:
            db.add(saas)
            await db.flush()

        saas_clauses = [
            {
                "clause_index": 0,
                "section_heading": "Section 2 — License Grant",
                "clause_text": (
                    "Subject to the terms of this Agreement and payment of all applicable fees, "
                    "TechCo hereby grants Enterprise Client a non-exclusive, non-transferable, "
                    "non-sublicensable, limited license to access and use the Service solely for "
                    "Enterprise Client's internal business purposes during the Subscription Term."
                ),
                "clause_type": "ip_ownership",
                "risk_score": 0.12,
                "risk_level": "low",
                "risk_category": "ip_assignment",
                "explanation": (
                    "Standard SaaS license grant with appropriate restrictions. Non-exclusive, "
                    "non-transferable, non-sublicensable, and scoped to internal business use — "
                    "this is the exact language you want to see in a SaaS license.\n\n"
                    "**Market context:** This matches the boilerplate in virtually every "
                    "enterprise SaaS agreement. No negotiation needed."
                ),
                "suggestion": None,
            },
            {
                "clause_index": 1,
                "section_heading": "Section 8 — Indemnification",
                "clause_text": (
                    "Enterprise Client shall defend, indemnify, and hold harmless TechCo and its "
                    "officers, directors, employees, agents, and successors from and against any "
                    "and all claims, damages, losses, costs, and expenses (including reasonable "
                    "attorneys' fees) arising out of or relating to: (a) Enterprise Client's use "
                    "of the Service; (b) any data or content submitted by Enterprise Client; "
                    "(c) any breach of this Agreement by Enterprise Client; or (d) any violation "
                    "of applicable law by Enterprise Client. TechCo shall have no indemnification "
                    "obligations to Enterprise Client under this Agreement."
                ),
                "clause_type": "indemnification",
                "risk_score": 0.95,
                "risk_level": "critical",
                "risk_category": "indemnification",
                "metadata_": {
                    "confidence": 0.95,
                    "legal_grounding": {
                        "source": "trustfoundry_cached",
                        "verified": True,
                        "citations": [
                            {
                                "citation": "Restatement (Third) of Torts: Apportionment of Liability § 22",
                                "summary": "Courts scrutinize one-sided indemnification agreements for unconscionability. While enforceable between sophisticated parties, unlimited indemnification with no cap and no reciprocity is highly unusual and creates asymmetric risk exposure that courts may narrow.",
                                "source_url": None,
                                "verified": True,
                            },
                        ],
                        "provider": "TrustFoundry",
                    },
                },
                "explanation": (
                    "This indemnification is critically one-sided and should be a deal-stopper "
                    "as written. Enterprise Client accepts **unlimited indemnification** for "
                    "any claim \"arising out of or relating to\" use of the Service — which is "
                    "broad enough to cover TechCo's own product failures, third-party IP "
                    "infringement in TechCo's software, and regulatory violations caused by "
                    "TechCo's own engineering decisions. The explicit carve-out eliminates any "
                    "ambiguity: TechCo bears zero risk.\n\n"
                    "**Market context:** Market standard in enterprise SaaS is mutual "
                    "indemnification, with each party indemnifying for their own IP infringement, "
                    "gross negligence, and willful misconduct. Caps are typically set at 12 "
                    "months of fees paid. This clause has no cap and zero reciprocity.\n\n"
                    "**If triggered:** Enterprise Client could be liable for all damages, "
                    "attorneys' fees, and costs in any lawsuit involving the software, including "
                    "cases caused entirely by TechCo's product defects. Exposure is unlimited."
                ),
                "suggestion": (
                    "Replace with mutual indemnification: Each party shall indemnify the other "
                    "for: (a) that party's breach of its representations and warranties; "
                    "(b) that party's gross negligence or willful misconduct; (c) for TechCo: "
                    "third-party IP infringement claims arising from the Service as delivered "
                    "(not from Client's modifications); (d) for Client: Client Data submitted to "
                    "the Service that infringes third-party IP. Cap each party's indemnification "
                    "obligations at 12 months of fees paid in the prior subscription year."
                ),
            },
            {
                "clause_index": 2,
                "section_heading": "Section 9 — Limitation of Liability",
                "clause_text": (
                    "IN NO EVENT SHALL TECHCO BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, "
                    "EXEMPLARY, CONSEQUENTIAL, OR PUNITIVE DAMAGES. TECHCO'S TOTAL CUMULATIVE "
                    "LIABILITY ARISING OUT OF OR RELATED TO THIS AGREEMENT SHALL NOT EXCEED THE "
                    "GREATER OF (A) THE FEES PAID BY ENTERPRISE CLIENT IN THE THREE (3) MONTHS "
                    "PRECEDING THE CLAIM, OR (B) ONE THOUSAND DOLLARS ($1,000)."
                ),
                "clause_type": "limitation_of_liability",
                "risk_score": 0.78,
                "risk_level": "high",
                "risk_category": "liability",
                "metadata_": {
                    "confidence": 0.90,
                    "legal_grounding": {
                        "source": "trustfoundry_cached",
                        "verified": True,
                        "citations": [
                            {
                                "citation": "U.C.C. § 2-719(3)",
                                "summary": "Limitation of consequential damages is enforceable unless unconscionable. A cap grossly disproportionate to actual likely damages — such as $1,000 on a six-figure contract — may be found unconscionable by courts applying the UCC standard.",
                                "source_url": None,
                                "verified": True,
                            },
                        ],
                        "provider": "TrustFoundry",
                    },
                },
                "explanation": (
                    "TechCo's liability is capped at 3 months of fees **or $1,000** — whichever "
                    "is greater. For an enterprise contract with annual fees potentially in the "
                    "hundreds of thousands, this cap is token-level exposure protection for "
                    "TechCo. The consequential damages waiver combined with this cap means that "
                    "even a complete service outage causing significant business disruption would "
                    "yield essentially no recovery.\n\n"
                    "**Market context:** Enterprise SaaS market standard is a liability cap of "
                    "12 months of fees paid, with carve-outs for confidentiality breaches and "
                    "indemnification obligations. A $1,000 floor is commercially unreasonable "
                    "for any meaningful enterprise deal and signals an unsophisticated or "
                    "predatory counterparty.\n\n"
                    "**If triggered:** A complete service failure during a critical business "
                    "period — month-end close, contract execution, regulatory filing — would "
                    "yield a maximum $1,000 recovery regardless of actual losses incurred."
                ),
                "suggestion": (
                    "Counter-propose: TechCo's aggregate liability shall not exceed the fees "
                    "actually paid in the 12 months preceding the claim. Carve out from the "
                    "cap: (a) confidentiality breaches; (b) IP indemnification; (c) gross "
                    "negligence or willful misconduct; (d) data breaches involving personal "
                    "data. Remove the $1,000 floor entirely — it has no legitimate purpose."
                ),
            },
            {
                "clause_index": 3,
                "section_heading": "Section 11 — Auto-Renewal",
                "clause_text": (
                    "This Agreement shall automatically renew for successive one-year terms unless "
                    "either party provides written notice of non-renewal at least fifteen (15) "
                    "days prior to the end of the then-current Subscription Term. TechCo may "
                    "adjust pricing for any renewal term by providing notice no later than ten "
                    "(10) days prior to renewal."
                ),
                "clause_type": "auto_renewal",
                "risk_score": 0.84,
                "risk_level": "high",
                "risk_category": "termination",
                "metadata_": {
                    "confidence": 0.92,
                    "legal_grounding": {
                        "source": "trustfoundry_cached",
                        "verified": True,
                        "citations": [
                            {
                                "citation": "Cal. Bus. & Prof. Code §§ 17600–17606 (Automatic Renewal Law)",
                                "summary": "California requires automatic renewal terms to be presented clearly and conspicuously before purchase, with an easy cancellation mechanism. A 15-day window on an annual contract may fail the 'clear and conspicuous' standard, potentially voiding the auto-renewal.",
                                "source_url": "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=17600&lawCode=BPC",
                                "verified": True,
                            },
                        ],
                        "provider": "TrustFoundry",
                    },
                },
                "explanation": (
                    "Two compounding risks. First: a **15-day non-renewal window** on an "
                    "annual subscription is dangerously short. If your team misses the window, "
                    "you are locked into another full year regardless of performance, pricing, "
                    "or changed business needs. Second: TechCo can increase pricing with only "
                    "**10 days' notice** before renewal — leaving insufficient time to evaluate, "
                    "budget, or seek alternatives before being locked in.\n\n"
                    "**Market context:** Enterprise SaaS standard is 60-90 days for non-renewal "
                    "notice. Price change notice should be at least 60-90 days, with a right to "
                    "terminate within 30 days if the increase exceeds a pre-agreed threshold "
                    "(typically CPI + 5%). This clause is an intentional lock-in mechanism.\n\n"
                    "**If triggered:** Missing the 15-day window by even one day commits your "
                    "client to 12+ months of fees, potentially at a new price set with only "
                    "10 days' notice. Annual exposure on a $200K/year contract: $200K locked in."
                ),
                "suggestion": (
                    "Counter-propose: (a) Non-renewal notice extended to 90 days prior to "
                    "expiration; (b) Pricing for renewal term communicated at least 90 days "
                    "prior to renewal; (c) If pricing increase exceeds 5% above prior year, "
                    "Client has 30 days after receiving notice to terminate without penalty; "
                    "(d) Add a data export right: upon non-renewal, TechCo shall provide "
                    "Client's data in machine-readable format for 90 days at no charge."
                ),
            },
            {
                "clause_index": 4,
                "section_heading": "Section 14 — Data Privacy",
                "clause_text": (
                    "TechCo may collect and process data submitted by Enterprise Client ('Customer "
                    "Data') in accordance with its Privacy Policy, which TechCo may update from "
                    "time to time. TechCo may use aggregated, anonymized Customer Data for "
                    "product improvement, benchmarking, and marketing purposes."
                ),
                "clause_type": "data_privacy",
                "risk_score": 0.76,
                "risk_level": "high",
                "risk_category": "compliance",
                "metadata_": {
                    "confidence": 0.91,
                    "legal_grounding": {
                        "source": "trustfoundry_cached",
                        "verified": True,
                        "citations": [
                            {
                                "citation": "Cal. Civ. Code § 1798.100 (CCPA)",
                                "summary": "California consumers have the right to know what personal information is collected and to opt out of its sale or use for commercial purposes. Businesses processing California consumer data must prohibit service providers from using data for their own commercial purposes, including marketing.",
                                "source_url": "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1798.100&lawCode=CIV",
                                "verified": True,
                            },
                            {
                                "citation": "GDPR Article 28 (EU 2016/679)",
                                "summary": "Any processing by a processor must be governed by a binding Data Processing Agreement. The absence of a DPA, and permission to use customer data for marketing, directly violates Article 28 requirements for enterprises with EU operations.",
                                "source_url": "https://gdpr-info.eu/art-28-gdpr/",
                                "verified": True,
                            },
                        ],
                        "provider": "TrustFoundry",
                    },
                },
                "explanation": (
                    "Three distinct compliance failures in this clause. First: there is **no "
                    "Data Processing Agreement (DPA)** — required by GDPR Article 28 for any "
                    "controller-processor relationship and strongly expected under CCPA. Second: "
                    "TechCo reserves the right to use your data for **marketing purposes** after "
                    "anonymization — a carve-out that may conflict with your own data use "
                    "restrictions and your customers' privacy expectations. Third: the Privacy "
                    "Policy can be updated unilaterally at any time, meaning your data protection "
                    "terms can change without your consent.\n\n"
                    "**Market context:** Any enterprise SaaS agreement involving personal data "
                    "must include a standalone DPA with subprocessor lists, standard contractual "
                    "clauses for international transfers, and a prohibition on using customer "
                    "data for the vendor's own commercial purposes.\n\n"
                    "**If triggered:** Your client could face GDPR fines up to 4% of global "
                    "revenue for processing personal data without a compliant DPA. TechCo's "
                    "use of your data for marketing could trigger breach notifications under "
                    "your own customer contracts."
                ),
                "suggestion": (
                    "Require execution of a standalone Data Processing Agreement (DPA) as a "
                    "condition of this Agreement's effectiveness. The DPA must: (a) restrict "
                    "TechCo to processing data only on documented instructions; (b) prohibit "
                    "any use of Customer Data for TechCo's own business purposes including "
                    "marketing and benchmarking; (c) require 30 days' advance notice of "
                    "Privacy Policy changes affecting data processing, with a termination right "
                    "for material changes; (d) include an approved subprocessor list with "
                    "30-day notification of additions."
                ),
            },
            {
                "clause_index": 5,
                "section_heading": "Section 5 — Ownership of Work Product",
                "clause_text": (
                    "All customizations, configurations, integrations, and derivative works "
                    "created by TechCo in connection with Enterprise Client's deployment shall "
                    "be the sole and exclusive property of TechCo. Enterprise Client shall have "
                    "no ownership interest in any work product created under this Agreement, "
                    "including any custom modules or configurations paid for by Enterprise Client."
                ),
                "clause_type": "ip_ownership",
                "risk_score": 0.71,
                "risk_level": "high",
                "risk_category": "ip_assignment",
                "explanation": (
                    "TechCo retains ownership of all customizations even those **paid for by "
                    "Enterprise Client**. This means custom modules, workflow automations, and "
                    "integrations built specifically for Enterprise Client's needs belong to "
                    "TechCo and can be resold to competitors.\n\n"
                    "**Market context:** SaaS customizations paid for by the customer are "
                    "increasingly treated as work-for-hire in modern enterprise agreements, "
                    "with the customer owning their configurations or at minimum receiving an "
                    "irrevocable perpetual license to use them independently of the SaaS platform.\n\n"
                    "**If triggered:** If Enterprise Client migrates away from TechCo, they "
                    "lose all custom integrations they paid to build. Vendor lock-in is the "
                    "intended effect of this provision."
                ),
                "suggestion": (
                    "Add: \"Notwithstanding the foregoing, all customizations and configurations "
                    "created specifically to Enterprise Client's specifications and paid for by "
                    "Enterprise Client shall be subject to a perpetual, irrevocable, royalty-free "
                    "license to Enterprise Client to use, modify, and operate such customizations "
                    "in connection with any software platform, independent of the Service.\""
                ),
            },
            {
                "clause_index": 6,
                "section_heading": "Section 4 — SLA and Uptime",
                "clause_text": (
                    "TechCo will use commercially reasonable efforts to maintain Service "
                    "availability. TechCo provides no uptime guarantee or service level "
                    "commitments. Enterprise Client acknowledges that scheduled and unscheduled "
                    "maintenance may occur at any time. TechCo shall have no liability for "
                    "any service outages, regardless of duration or cause."
                ),
                "clause_type": "sla",
                "risk_score": 0.67,
                "risk_level": "high",
                "risk_category": "service_level",
                "explanation": (
                    "No SLA, no uptime guarantee, no credit mechanism, no liability for "
                    "outages. \"Commercially reasonable efforts\" is the weakest possible "
                    "contractual commitment — courts have found this standard satisfied by "
                    "almost any non-negligent conduct.\n\n"
                    "**Market context:** Enterprise SaaS standard is 99.9% uptime SLA with "
                    "service credits (typically 10-30% of monthly fees per hour of excess "
                    "downtime). Any SaaS agreement without an SLA for an enterprise customer "
                    "is a negotiating failure.\n\n"
                    "**If triggered:** A week-long outage affecting business operations yields "
                    "zero contractual remedy. Combined with the $1,000 liability cap, practical "
                    "recovery is zero regardless of actual damages."
                ),
                "suggestion": (
                    "Require a standalone SLA with: (a) 99.9% monthly uptime commitment; "
                    "(b) automatic service credits of 10% of monthly fees per each hour below "
                    "SLA, up to 100% of monthly fees; (c) definition of 'downtime' excluding "
                    "only scheduled maintenance with 5 days' advance notice; "
                    "(d) termination right if SLA is breached for 2 consecutive months."
                ),
            },
            {
                "clause_index": 7,
                "section_heading": "Section 16 — Assignment and Change of Control",
                "clause_text": (
                    "TechCo may assign this Agreement, in whole or in part, to any successor "
                    "entity in connection with a merger, acquisition, or sale of all or "
                    "substantially all of TechCo's assets, without Enterprise Client's prior "
                    "written consent. Enterprise Client may not assign this Agreement without "
                    "TechCo's prior written consent, which TechCo may withhold in its sole "
                    "discretion. Any purported assignment in violation of this section is void."
                ),
                "clause_type": "assignment",
                "risk_score": 0.55,
                "risk_level": "medium",
                "risk_category": "assignment",
                "explanation": (
                    "One-sided assignment: TechCo can freely assign upon M&A but Enterprise "
                    "Client cannot without TechCo's consent. This means if TechCo is acquired "
                    "by a competitor, Enterprise Client is suddenly in a contractual relationship "
                    "with that competitor — with no exit right.\n\n"
                    "**Market context:** Market standard in enterprise SaaS is either mutual "
                    "assignment rights upon M&A, or a matching right: if TechCo can assign "
                    "without consent, so can Enterprise Client.\n\n"
                    "**If triggered:** TechCo could be acquired by a direct competitor of "
                    "Enterprise Client. All contract data, customizations, and SLA history "
                    "would pass to the competitor with no right to exit."
                ),
                "suggestion": (
                    "Add parity: \"Enterprise Client may also assign this Agreement without "
                    "consent in connection with its own merger, acquisition, or restructuring "
                    "to any entity that agrees in writing to assume all obligations hereunder.\" "
                    "Also add a change-of-control exit right: \"If TechCo is acquired by a "
                    "direct competitor of Enterprise Client, Enterprise Client may terminate "
                    "within 30 days without penalty.\""
                ),
            },
        ]

        _enrich(saas_clauses)
        if need_saas:
            for c in saas_clauses:
                db.add(Clause(contract_id=saas.id, **c))

        # ── Contract 3: Vendor MSA — CRITICAL risk (the demo star) ────────────
        _msa_text = _read_sample("acme_vendor_msa.txt")
        msa = Contract(
            user_id=user.id,
            filename="demo_vendor_msa.txt",
            original_filename="Vendor Master Services Agreement — GlobalSupply Partners.txt",
            file_path="/app/uploads/demo_vendor_msa.txt",
            file_type="txt",
            file_size_bytes=14800,
            title="Vendor Master Services Agreement — GlobalSupply Partners",
            parties={"names": ["GlobalSupply Partners, Inc.", "Meridian Holdings Corp."]},
            effective_date=date(2025, 3, 1),
            expiration_date=date(2027, 2, 28),
            governing_law="New York",
            contract_type="MSA",
            overall_risk_score=0.91,
            risk_level="critical",
            status="analyzed",
            raw_text=_msa_text,
            summary=(
                "This Vendor MSA presents critical-level risk and should not proceed to execution "
                "without senior partner review and material restructuring. Four provisions require "
                "immediate attention. Section 9 contains an uncapped, unlimited indemnification "
                "obligation on Meridian with zero reciprocal protection — potentially unlimited "
                "financial exposure. Section 12.3 embeds a change-of-control termination clause "
                "triggered by any acquisition of Meridian, allowing GlobalSupply to terminate with "
                "only 5 days' notice post-close — a structural deal-risk in any M&A context. "
                "Section 15.1 grants GlobalSupply a perpetual, irrevocable, royalty-free license "
                "to all deliverables, effectively transferring IP ownership without compensation. "
                "Section 17 contains a broad non-compete spanning 36 months and unlimited "
                "geography — likely unenforceable but creating litigation exposure regardless. "
                "Do not execute. Recommend full redline and re-negotiation."
            ),
        )
        if need_msa:
            db.add(msa)
            await db.flush()

        msa_clauses = [
            {
                "clause_index": 0,
                "section_heading": "Section 1 — Scope of Services",
                "clause_text": (
                    "GlobalSupply Partners agrees to provide Meridian Holdings with supply chain "
                    "management, vendor coordination, and logistics optimization services as "
                    "described in each Statement of Work (\"SOW\") executed hereunder. Each SOW "
                    "shall be incorporated herein by reference and shall govern the specific "
                    "services, deliverables, and fees for the applicable engagement."
                ),
                "clause_type": "general",
                "risk_score": 0.10,
                "risk_level": "low",
                "risk_category": "general",
                "explanation": (
                    "Standard scope-of-services clause tying deliverables to individual "
                    "Statements of Work. The SOW-by-SOW structure is market standard for "
                    "professional services MSAs and provides reasonable specificity.\n\n"
                    "**Market context:** This language is boilerplate and acceptable as written. "
                    "Ensure each SOW includes clear acceptance criteria and milestone schedules."
                ),
                "suggestion": None,
            },
            {
                "clause_index": 1,
                "section_heading": "Section 9 — Indemnification",
                "clause_text": (
                    "Meridian Holdings shall defend, indemnify, and hold harmless GlobalSupply "
                    "Partners, its affiliates, officers, directors, employees, agents, successors, "
                    "and assigns from and against any and all claims, demands, actions, losses, "
                    "damages, liabilities, costs, and expenses whatsoever (including reasonable "
                    "attorneys' fees) arising from or related to: (i) Meridian's use of the "
                    "Services; (ii) any breach of this Agreement by Meridian; (iii) Meridian's "
                    "business operations; or (iv) any third-party claims related to Meridian's "
                    "industry or regulatory environment. GlobalSupply's indemnification obligations "
                    "to Meridian are expressly excluded."
                ),
                "clause_type": "indemnification",
                "risk_score": 0.97,
                "risk_level": "critical",
                "risk_category": "indemnification",
                "metadata_": {
                    "confidence": 0.97,
                    "legal_grounding": {
                        "source": "trustfoundry_cached",
                        "verified": True,
                        "citations": [
                            {
                                "citation": "N.Y. Gen. Oblig. Law § 5-322.1",
                                "summary": "New York voids indemnification provisions that require indemnification for a party's own negligence in certain contexts. In commercial services contracts, courts scrutinize indemnification for clauses that extend liability to events entirely unrelated to the services rendered, such as industry-wide regulatory claims.",
                                "source_url": "https://www.nysenate.gov/legislation/laws/GOB/5-322.1",
                                "verified": True,
                            },
                        ],
                        "provider": "TrustFoundry",
                    },
                },
                "explanation": (
                    "This is among the most dangerous indemnification clauses in commercial "
                    "contracting. Meridian accepts **unlimited liability** for claims arising "
                    "from its own industry and regulatory environment — categories entirely "
                    "outside Meridian's control. Clause (iii) expands the indemnity to all of "
                    "Meridian's business operations, not just those connected to this agreement. "
                    "Clause (iv) extends liability to third-party claims from Meridian's "
                    "regulatory sector — meaning if a regulator sues anyone in Meridian's "
                    "industry, GlobalSupply could seek indemnification from Meridian.\n\n"
                    "**Market context:** Market-standard MSA indemnification is mutual, capped "
                    "at 12 months of fees, and scoped to breach and gross negligence only. "
                    "This clause has no cap, no reciprocity, and no causation requirement.\n\n"
                    "**If triggered:** Meridian could be liable for GlobalSupply's legal fees, "
                    "damages, and losses in any dispute — including claims caused entirely by "
                    "GlobalSupply's own failures. Total exposure: unlimited."
                ),
                "suggestion": (
                    "Reject this clause entirely and replace with mutual indemnification: "
                    "Each party indemnifies the other for (a) that party's material breach, "
                    "(b) gross negligence or willful misconduct, and (c) death or personal injury "
                    "caused by that party's negligence. Cap aggregate indemnification at 12 "
                    "months of fees paid under the applicable SOW. Remove items (iii) and (iv) "
                    "entirely — they have no justification in a vendor services agreement."
                ),
            },
            {
                "clause_index": 2,
                "section_heading": "Section 12.3 — Change of Control",
                "clause_text": (
                    "In the event of a Change of Control of Meridian Holdings (defined as any "
                    "transaction resulting in a change of more than 50% of Meridian's voting "
                    "securities or the sale of all or substantially all of Meridian's assets), "
                    "GlobalSupply Partners may, at its sole discretion, terminate this Agreement "
                    "and all outstanding Statements of Work upon five (5) business days' written "
                    "notice to Meridian. GlobalSupply shall have no obligation to complete "
                    "in-progress deliverables upon exercise of this termination right."
                ),
                "clause_type": "change_of_control",
                "risk_score": 0.93,
                "risk_level": "critical",
                "risk_category": "change_of_control",
                "metadata_": {
                    "confidence": 0.93,
                    "legal_grounding": {
                        "source": "trustfoundry_cached",
                        "verified": True,
                        "citations": [
                            {
                                "citation": "U.C.C. § 9-406 (Anti-Assignment and Change of Control)",
                                "summary": "Change-of-control termination rights in commercial services contracts are generally enforceable when clearly drafted. Courts in M&A transactions routinely identify these clauses as material contract risks requiring consent or waiver from the counterparty before closing.",
                                "source_url": None,
                                "verified": True,
                            },
                        ],
                        "provider": "TrustFoundry",
                    },
                },
                "explanation": (
                    "This change-of-control clause is a structural M&A deal-killer. Any "
                    "acquisition of Meridian Holdings — including by a private equity firm, "
                    "strategic acquirer, or even an internal restructuring — triggers "
                    "GlobalSupply's unilateral right to terminate all active work with only "
                    "**5 business days' notice**. There is no obligation to complete work in "
                    "progress, meaning an acquirer could inherit a project that is immediately "
                    "abandoned mid-delivery.\n\n"
                    "**Market context:** Market-standard change-of-control protections for "
                    "vendors require 30-90 days' notice, an obligation to complete work in "
                    "progress through the notice period, and termination fees for stranded "
                    "deliverables. The 5-day window here is commercially punitive and unusual.\n\n"
                    "**If triggered:** In an M&A context, buyer's counsel will flag this as "
                    "a material risk. An acquirer paying a premium for Meridian's supply chain "
                    "relationships could see GlobalSupply walk away within a week of close, "
                    "abandoning critical in-progress work."
                ),
                "suggestion": (
                    "Counter-propose: (a) Extend notice period to 90 days post-close; "
                    "(b) GlobalSupply must complete all SOWs that are 50%+ complete as of the "
                    "change-of-control date; (c) Add consent right — GlobalSupply may not "
                    "withhold consent unreasonably for acquirers who meet a creditworthiness "
                    "threshold; (d) Include a cure period — if the acquirer provides a written "
                    "assumption of obligations within 30 days of close, the termination right "
                    "is extinguished. This reflects market-standard assignment provisions."
                ),
            },
            {
                "clause_index": 3,
                "section_heading": "Section 15.1 — Intellectual Property",
                "clause_text": (
                    "All deliverables, work product, software, methodologies, tools, and "
                    "materials created by GlobalSupply in connection with Services provided "
                    "under this Agreement shall be the sole and exclusive property of Meridian "
                    "Holdings. Notwithstanding the foregoing, Meridian hereby grants to "
                    "GlobalSupply a perpetual, irrevocable, royalty-free, worldwide license to "
                    "use, reproduce, modify, display, and create derivative works from all "
                    "deliverables for any purpose, including use in engagements with other "
                    "clients and for GlobalSupply's internal development purposes."
                ),
                "clause_type": "ip_ownership",
                "risk_score": 0.88,
                "risk_level": "critical",
                "risk_category": "ip_assignment",
                "metadata_": {
                    "confidence": 0.93,
                    "legal_grounding": {
                        "source": "trustfoundry_cached",
                        "verified": True,
                        "citations": [
                            {
                                "citation": "17 U.S.C. § 101 (Work Made for Hire)",
                                "summary": "Under federal copyright law, work-for-hire vests ownership in the commissioning party only when the work falls within nine enumerated categories and is made pursuant to a written agreement. A perpetual royalty-free license-back effectively nullifies the ownership grant, creating a de facto joint ownership arrangement without the protections of formal joint ownership.",
                                "source_url": "https://www.copyright.gov/title17/92chap1.html#101",
                                "verified": True,
                            },
                        ],
                        "provider": "TrustFoundry",
                    },
                },
                "explanation": (
                    "This clause creates a false sense of ownership. It nominally vests IP "
                    "in Meridian, but then immediately grants GlobalSupply a **perpetual, "
                    "irrevocable, royalty-free license** to use all deliverables for any "
                    "purpose — including with competing clients. In effect, Meridian pays for "
                    "custom work product that GlobalSupply can immediately repurpose for "
                    "Meridian's direct competitors with zero restriction.\n\n"
                    "**Market context:** Standard work-for-hire arrangements vest IP fully in "
                    "the client with no license-back to the vendor except for pre-existing "
                    "tools the vendor brings to the engagement (a \"background IP\" carve-out). "
                    "The perpetual, irrevocable, royalty-free license here effectively converts "
                    "custom deliverables into GlobalSupply's reusable product.\n\n"
                    "**If triggered:** Meridian's custom-built supply chain optimization model "
                    "or proprietary pricing methodology could be licensed by GlobalSupply to "
                    "a competitor the next day with no recourse."
                ),
                "suggestion": (
                    "Retain the vesting language and add: \"GlobalSupply retains ownership of "
                    "its Pre-Existing IP (defined as tools, methodologies, and IP developed "
                    "independently of this engagement), and hereby grants Meridian a perpetual, "
                    "irrevocable, royalty-free license to use Pre-Existing IP embedded in "
                    "deliverables solely for Meridian's internal business purposes.\" Delete "
                    "the license-back in Section 15.1 entirely — GlobalSupply has no "
                    "legitimate need for a license to deliverables paid for by Meridian."
                ),
            },
            {
                "clause_index": 4,
                "section_heading": "Section 17 — Non-Compete",
                "clause_text": (
                    "During the term of this Agreement and for a period of thirty-six (36) months "
                    "following its termination or expiration for any reason, Meridian Holdings "
                    "shall not, directly or indirectly, engage, employ, contract with, or "
                    "otherwise retain any individual or entity that provides supply chain "
                    "management, logistics optimization, or vendor coordination services "
                    "anywhere in the world, without the prior written consent of GlobalSupply."
                ),
                "clause_type": "non_compete",
                "risk_score": 0.91,
                "risk_level": "critical",
                "risk_category": "non_compete",
                "metadata_": {
                    "confidence": 0.91,
                    "legal_grounding": {
                        "source": "trustfoundry_cached",
                        "verified": True,
                        "citations": [
                            {
                                "citation": "BDO Seidman v. Hirshberg, 93 N.Y.2d 382 (1999)",
                                "summary": "New York's Court of Appeals held that non-compete restrictions must satisfy a four-factor reasonableness test. A 36-month worldwide ban on an entire industry function — with no geographic limit and no connection to trade secrets — would fail this test. Courts may blue-pencil or void such provisions entirely.",
                                "source_url": None,
                                "verified": True,
                            },
                        ],
                        "provider": "TrustFoundry",
                    },
                },
                "explanation": (
                    "This non-compete clause would prohibit Meridian from hiring any supply "
                    "chain professional or engaging any logistics vendor for **36 months "
                    "worldwide** after this agreement ends. This is commercially absurd — it "
                    "would prevent Meridian from operating its core business after termination. "
                    "While courts would likely find this unenforceable due to its scope, the "
                    "clause creates litigation risk and could delay a subsequent vendor "
                    "engagement for months during dispute resolution.\n\n"
                    "**Market context:** Enforceable non-solicitation provisions in vendor "
                    "agreements are typically limited to (a) soliciting the vendor's specific "
                    "named employees, (b) for 12 months, (c) in defined service categories. "
                    "A 36-month worldwide ban on an entire industry function has no precedent "
                    "in arm's-length commercial contracting.\n\n"
                    "**If triggered:** Even an unenforceable clause creates leverage. "
                    "GlobalSupply could threaten litigation when Meridian hires its next "
                    "logistics provider, forcing a settlement or delayed onboarding."
                ),
                "suggestion": (
                    "Replace with a mutual non-solicitation of named employees only: "
                    "\"During the Term and for 12 months thereafter, neither party shall "
                    "directly solicit for employment any named individual who provided "
                    "services under an active SOW without the other party's prior written "
                    "consent.\" Delete the competitive restriction entirely — vendors have "
                    "no legitimate interest in restricting a client's ability to hire "
                    "industry professionals or engage replacement service providers."
                ),
            },
            {
                "clause_index": 5,
                "section_heading": "Section 20 — Governing Law and Dispute Resolution",
                "clause_text": (
                    "This Agreement shall be governed by and construed in accordance with the "
                    "laws of the State of New York, without regard to conflict of law principles. "
                    "Any dispute arising under this Agreement shall be resolved by binding "
                    "arbitration administered by the American Arbitration Association under its "
                    "Commercial Arbitration Rules. The arbitration shall be conducted in "
                    "New York, New York. Each party shall bear its own attorneys' fees."
                ),
                "clause_type": "dispute_resolution",
                "risk_score": 0.22,
                "risk_level": "low",
                "risk_category": "general",
                "explanation": (
                    "Standard New York governing law with AAA arbitration. This is market-standard "
                    "dispute resolution language for commercial contracts between sophisticated "
                    "parties. The AAA Commercial Rules are well-established and the New York "
                    "seat is common for vendor agreements.\n\n"
                    "**Market context:** The fee-bearing provision (each party pays its own "
                    "attorneys' fees) is the American rule and standard in commercial contracts. "
                    "No negotiation needed on this section."
                ),
                "suggestion": None,
            },
            {
                "clause_index": 6,
                "section_heading": "Section 5 — Fees and Rate Escalation",
                "clause_text": (
                    "GlobalSupply Partners shall invoice Meridian Holdings monthly for services "
                    "rendered. GlobalSupply may increase its rates upon thirty (30) days' written "
                    "notice. Rate increases shall be accepted by Meridian's continued use of the "
                    "services following the notice period. In the event of a fee dispute, Meridian "
                    "must continue paying all invoiced amounts pending resolution, and may recover "
                    "any disputed amounts only after arbitration in GlobalSupply's favor."
                ),
                "clause_type": "payment_terms",
                "risk_score": 0.73,
                "risk_level": "high",
                "risk_category": "payment",
                "explanation": (
                    "Two compounding risks: (1) GlobalSupply can raise rates unilaterally with "
                    "only 30 days' notice, with no cap on the increase amount; (2) the fee "
                    "dispute mechanism is explicitly one-sided — Meridian must pay disputed "
                    "amounts upfront and can only recover after a full arbitration proceeding.\n\n"
                    "**Market context:** Market standard for professional services MSAs is "
                    "either fixed rates for the contract term or CPI-indexed increases with "
                    "a cap (typically 3-5%). Dispute mechanisms should allow withholding of "
                    "disputed amounts pending resolution, not require payment in advance.\n\n"
                    "**If triggered:** GlobalSupply could double rates mid-engagement. "
                    "Meridian must pay or risk breach, with no practical recourse until "
                    "arbitration resolves months later."
                ),
                "suggestion": (
                    "Add: \"Rate increases shall not exceed the lesser of (a) five percent (5%) "
                    "above the prior year's rates or (b) the CPI increase for the prior 12 months. "
                    "Meridian may withhold bona fide disputed amounts up to 20% of any invoice "
                    "pending written dispute resolution, without being in breach of this Agreement.\""
                ),
            },
            {
                "clause_index": 7,
                "section_heading": "Section 8.2 — Limitation of Liability",
                "clause_text": (
                    "GlobalSupply Partners' total liability to Meridian Holdings under this "
                    "Agreement for any and all causes of action shall not exceed the fees paid "
                    "by Meridian to GlobalSupply in the thirty (30) days immediately preceding "
                    "the event giving rise to the claim. GlobalSupply shall have no liability "
                    "for any indirect, consequential, or special damages regardless of cause."
                ),
                "clause_type": "limitation_of_liability",
                "risk_score": 0.68,
                "risk_level": "high",
                "risk_category": "liability",
                "explanation": (
                    "GlobalSupply's liability is capped at 30 days of fees — approximately "
                    "1/12th of annual engagement value. On a $2M/year supply chain management "
                    "contract, GlobalSupply's exposure for a catastrophic supply chain failure "
                    "would be approximately $167K, while Meridian could face millions in "
                    "business disruption. Combined with the unlimited indemnification obligation "
                    "flowing the other direction, the liability asymmetry is extreme.\n\n"
                    "**Market context:** Standard vendor MSA caps are 12 months of fees paid "
                    "in the prior year, with carve-outs for death/personal injury, gross "
                    "negligence, willful misconduct, IP infringement, and confidentiality "
                    "breaches. 30 days is significantly below market.\n\n"
                    "**If triggered:** A major supply chain disruption caused by GlobalSupply's "
                    "negligence would yield a recovery cap of ~1/12 the damages. Meridian is "
                    "essentially self-insured against vendor performance failures."
                ),
                "suggestion": (
                    "Counter-propose: \"Each party's cumulative liability shall not exceed the "
                    "aggregate fees paid in the twelve (12) months preceding the claim. Carve out "
                    "from this cap: (a) indemnification obligations; (b) confidentiality breaches; "
                    "(c) gross negligence or willful misconduct; (d) personal injury or property "
                    "damage caused by the party's own personnel.\" This brings the cap to market "
                    "standard and maintains appropriate carve-outs."
                ),
            },
            {
                "clause_index": 8,
                "section_heading": "Section 3.1 — Termination Notice",
                "clause_text": (
                    "Either party may terminate this Agreement for convenience upon sixty (60) "
                    "days' prior written notice. Notwithstanding the foregoing, upon any "
                    "termination by Meridian for convenience, Meridian shall pay GlobalSupply "
                    "a termination fee equal to six (6) months of average monthly fees "
                    "calculated over the preceding twelve (12) months."
                ),
                "clause_type": "termination_convenience",
                "risk_score": 0.62,
                "risk_level": "high",
                "risk_category": "termination",
                "explanation": (
                    "60-day notice is within market range, but the six-month termination fee "
                    "is significantly above market standard for a convenience termination. "
                    "On a $2M/year contract, this represents approximately $1M in termination "
                    "penalties — effectively creating a 6-month lock-in on top of the notice period.\n\n"
                    "**Market context:** Termination fees in professional services MSAs are "
                    "typically 30-60 days of fees, or none at all with adequate notice. Six months "
                    "is an aggressive liquidated damages provision that may be challenged as a "
                    "penalty rather than a genuine pre-estimate of damages.\n\n"
                    "**If triggered during M&A:** An acquirer inheriting this contract who "
                    "wants to consolidate vendors faces a $1M+ exit cost just to terminate."
                ),
                "suggestion": (
                    "Propose: \"Either party may terminate for convenience upon ninety (90) days' "
                    "written notice without payment of any termination fee.\" If GlobalSupply "
                    "insists on a fee, cap it at 30 days of monthly fees (not 6 months), and "
                    "add a carve-out: no termination fee applies if termination occurs within "
                    "90 days of a change of control or if GlobalSupply is in material breach."
                ),
            },
        ]

        _enrich(msa_clauses)
        if need_msa:
            for c in msa_clauses:
                db.add(Clause(contract_id=msa.id, **c))

        # ── Contract 4: Executive Employment Agreement — LOW risk (green contrast) ──
        _emp_text = _read_sample("executive_employment_agreement.txt")
        emp = Contract(
            user_id=user.id,
            filename="demo_employment_pinnacle.txt",
            original_filename="Executive Employment Agreement — Pinnacle Dynamics.txt",
            file_path="/app/uploads/demo_employment_pinnacle.txt",
            file_type="txt",
            file_size_bytes=9200,
            title="Executive Employment Agreement — Pinnacle Dynamics",
            parties={"names": ["Pinnacle Dynamics, Inc.", "Jordan M. Whitfield"]},
            effective_date=date(2026, 3, 15),
            expiration_date=None,
            governing_law="Texas",
            contract_type="Employment",
            overall_risk_score=0.32,
            risk_level="low",
            status="analyzed",
            raw_text=_emp_text,
            summary=(
                "This Executive Employment Agreement is generally well-structured and largely "
                "market-standard for a VP-level hire at a growth-stage technology company. "
                "Severance protections (12 months base + pro-rated bonus + COBRA) are within "
                "normal range. The change-of-control double-trigger acceleration is favorable "
                "to Executive. Two provisions warrant review but are not deal-blockers: the "
                "non-compete in Section 6.1 is narrowly scoped to Texas and 12 months, which "
                "is enforceable under the Texas Business & Commerce Code; however, the IP "
                "assignment in Section 5.1 includes work created \"whether or not during "
                "working hours,\" which could sweep in personal side projects. Recommend "
                "adding a carve-out for unrelated personal inventions."
            ),
        )
        if need_emp:
            db.add(emp)
            await db.flush()

        emp_clauses = [
            {
                "clause_index": 0,
                "section_heading": "Section 3.3 — Severance",
                "clause_text": (
                    "If the Company terminates Executive without Cause, or if Executive resigns "
                    "for Good Reason, and subject to Executive's execution of a general release "
                    "of claims, the Company shall provide: (a) twelve (12) months of continued "
                    "base salary; (b) a pro-rated annual bonus for the year of termination; "
                    "(c) twelve (12) months of COBRA premium payments; and (d) acceleration of "
                    "six (6) months of unvested equity awards."
                ),
                "clause_type": "termination_convenience",
                "risk_score": 0.15,
                "risk_level": "low",
                "risk_category": "termination",
                "explanation": (
                    "Standard severance package for a VP-level executive. The 12-month base "
                    "salary continuation, pro-rated bonus, COBRA coverage, and partial equity "
                    "acceleration are all within market norms for Series B+ technology companies.\n\n"
                    "**Market context:** Market standard for VP-level severance is 6-12 months "
                    "of base salary. The 12-month package here is at the upper end of the range, "
                    "which is favorable to Executive. The release of claims requirement is "
                    "standard and expected."
                ),
                "suggestion": None,
            },
            {
                "clause_index": 1,
                "section_heading": "Section 3.5 — Change of Control",
                "clause_text": (
                    "In the event of a Change of Control, and if Executive's employment is "
                    "terminated without Cause or Executive resigns for Good Reason within twelve "
                    "(12) months following the Change of Control, then in addition to the "
                    "severance benefits in Section 3.3, one hundred percent (100%) of "
                    "Executive's unvested equity awards shall immediately vest."
                ),
                "clause_type": "change_of_control",
                "risk_score": 0.20,
                "risk_level": "low",
                "risk_category": "change_of_control",
                "explanation": (
                    "Double-trigger change-of-control protection: both a CIC event AND a "
                    "qualifying termination within 12 months are required to trigger "
                    "acceleration. This is the market-standard structure and avoids the "
                    "golden-parachute issues of single-trigger acceleration.\n\n"
                    "**Market context:** Double-trigger CIC acceleration is the norm for "
                    "executive agreements at venture-backed companies. The 12-month window "
                    "is standard. This clause is well-drafted and protective without being "
                    "excessive."
                ),
                "suggestion": None,
            },
            {
                "clause_index": 2,
                "section_heading": "Section 5.1 — IP Assignment",
                "clause_text": (
                    "Executive agrees that all inventions, discoveries, improvements, works of "
                    "authorship, software, designs, and other intellectual property conceived, "
                    "created, or reduced to practice by Executive during the term of employment, "
                    "whether or not during working hours, that relate to the Company's current "
                    "or planned business activities shall be the sole and exclusive property of "
                    "the Company. Executive hereby irrevocably assigns to the Company all right, "
                    "title, and interest in and to all Work Product."
                ),
                "clause_type": "ip_ownership",
                "risk_score": 0.55,
                "risk_level": "medium",
                "risk_category": "ip_assignment",
                "explanation": (
                    "The IP assignment scope is broad — it covers work created \"whether or not "
                    "during working hours\" as long as it relates to the Company's \"current or "
                    "planned\" business activities. The \"planned\" qualifier is expansive and "
                    "could sweep in personal side projects if the Company later claims the "
                    "project area was on its roadmap.\n\n"
                    "**Market context:** Standard employment IP assignments in tech cover work "
                    "created \"in the scope of employment\" or \"using company resources.\" The "
                    "\"whether or not during working hours\" extension is common in California "
                    "and Texas but should be paired with a clear carve-out for unrelated "
                    "personal inventions.\n\n"
                    "**If triggered:** Executive could lose ownership of a personal project if "
                    "the Company argues it relates to any \"planned\" business activity, even "
                    "if the project was developed entirely on personal time."
                ),
                "suggestion": (
                    "Add a carve-out: \"Notwithstanding the foregoing, Work Product shall not "
                    "include any invention that (a) was developed entirely on Executive's own "
                    "time, (b) without use of any Company resources, and (c) does not relate "
                    "to the Company's current (not planned) business activities or reasonably "
                    "anticipated research.\" This aligns with California Labor Code §2870 and "
                    "Texas common law on employee inventions."
                ),
            },
            {
                "clause_index": 3,
                "section_heading": "Section 6.1 — Non-Compete",
                "clause_text": (
                    "During Executive's employment and for a period of twelve (12) months "
                    "following the termination of employment for any reason, Executive shall "
                    "not, directly or indirectly, engage in, be employed by, consult for, or "
                    "have any ownership interest in any business that competes with the "
                    "Company's business within the State of Texas."
                ),
                "clause_type": "non_compete",
                "risk_score": 0.42,
                "risk_level": "medium",
                "risk_category": "non_compete",
                "metadata_": {
                    "confidence": 0.85,
                    "legal_grounding": {
                        "source": "trustfoundry_cached",
                        "verified": True,
                        "citations": [
                            {
                                "citation": "Tex. Bus. & Com. Code § 15.50",
                                "summary": "Texas enforces non-compete agreements if ancillary to an otherwise enforceable agreement and containing reasonable limitations as to time, geography, and scope. A 12-month Texas-only restriction in an executive employment agreement is generally enforceable under this standard.",
                                "source_url": "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.15.htm#15.50",
                                "verified": True,
                            },
                        ],
                        "provider": "TrustFoundry",
                    },
                },
                "explanation": (
                    "This non-compete is narrowly drafted: 12-month duration, limited to Texas, "
                    "and scoped to a specific industry (supply chain optimization/industrial "
                    "automation). Under the Texas Business & Commerce Code §15.50, non-competes "
                    "are enforceable if ancillary to an otherwise enforceable agreement and "
                    "reasonable in scope.\n\n"
                    "**Market context:** 12 months and a single-state restriction is at the "
                    "low end of executive non-competes, which typically run 12-24 months. "
                    "The narrow industry definition is favorable to Executive — it does not "
                    "prevent working in general technology roles.\n\n"
                    "**If triggered:** Executive would be restricted from working in supply "
                    "chain optimization or industrial automation companies in Texas for 12 "
                    "months post-departure. This is enforceable given the narrow scope."
                ),
                "suggestion": (
                    "Consider adding: \"The non-competition restriction shall not apply if "
                    "Executive's employment is terminated by the Company without Cause.\" This "
                    "is increasingly standard in executive agreements and prevents the Company "
                    "from firing Executive and simultaneously restricting future employment."
                ),
            },
            {
                "clause_index": 4,
                "section_heading": "Section 6.2 — Non-Solicitation",
                "clause_text": (
                    "During Executive's employment and for a period of eighteen (18) months "
                    "following termination, Executive shall not, directly or indirectly, "
                    "solicit, recruit, or induce any employee of the Company to leave the "
                    "Company's employment or to accept employment with any competitor."
                ),
                "clause_type": "non_solicitation",
                "risk_score": 0.30,
                "risk_level": "low",
                "risk_category": "non_solicitation",
                "explanation": (
                    "Standard employee non-solicitation provision. The 18-month duration is "
                    "slightly above the 12-month norm but generally enforceable. The restriction "
                    "is limited to active solicitation — it does not prevent employees from "
                    "voluntarily applying to Executive's new employer.\n\n"
                    "**Market context:** 12-18 months is standard for executive non-solicitation. "
                    "This clause does not include a customer non-solicitation (handled separately "
                    "in Section 6.3), which is appropriate separation."
                ),
                "suggestion": None,
            },
        ]

        _enrich(emp_clauses)
        if need_emp:
            for c in emp_clauses:
                db.add(Clause(contract_id=emp.id, **c))

        await db.commit()
        total_clauses = len(nda_clauses) + len(saas_clauses) + len(msa_clauses) + len(emp_clauses)
        print(f"✓ Seeded 4 demo contracts with {total_clauses} pre-analyzed clauses.")
        print(f"\nDemo credentials:")
        print(f"  Email:    {DEMO_EMAIL}")
        print(f"  Password: {DEMO_PASSWORD}")
        print(f"\nOpen http://localhost:3000 and click 'Demo Login'.")


if __name__ == "__main__":
    asyncio.run(seed())
