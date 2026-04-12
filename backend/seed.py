"""
Demo seed script — creates a demo user and uploads sample contracts for the hackathon demo.

Usage (from inside the backend container or with DATABASE_URL set):
    python seed.py

Or via docker:
    docker compose exec backend python seed.py
"""

import asyncio
import os
import sys
import uuid
from datetime import date

# Allow running from the backend/ directory
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://clauseguard:clauseguard@localhost:5432/clauseguard",
)

DEMO_EMAIL = "demo@clauseguard.ai"
DEMO_PASSWORD = "demo1234"
DEMO_NAME = "Demo Attorney"

engine = create_async_engine(DATABASE_URL, echo=False)
async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def seed():
    from app.models.user import User
    from app.models.contract import Contract
    from app.models.clause import Clause
    from app.database import Base
    from app.services.auth_service import hash_password

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as db:
        # Check if demo user exists
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
            print(f"Created demo user: {DEMO_EMAIL} / {DEMO_PASSWORD}")
        else:
            print(f"Demo user already exists: {DEMO_EMAIL}")

        # Check if we already have seeded contracts
        result = await db.execute(
            select(Contract).where(Contract.user_id == user.id)
        )
        existing_contracts = list(result.scalars().all())

        if existing_contracts:
            print(f"Demo data already seeded ({len(existing_contracts)} contracts). Skipping.")
            await db.commit()
            return

        # ── Contract 1: NDA with moderate risk ──────────────────────────────
        nda = Contract(
            user_id=user.id,
            filename="demo_nda_acme.txt",
            original_filename="NDA - Acme Technologies.txt",
            file_path="/app/uploads/demo_nda_acme.txt",
            file_type="txt",
            file_size_bytes=4200,
            title="Mutual Non-Disclosure Agreement — Acme Technologies",
            parties={"names": ["Acme Technologies, Inc.", "Vertex Legal Solutions, LLC"]},
            effective_date=date(2026, 1, 15),
            expiration_date=date(2029, 1, 15),
            governing_law="California",
            contract_type="NDA",
            overall_risk_score=0.41,
            risk_level="medium",
            status="analyzed",
            summary=(
                "This Mutual NDA between Acme Technologies and Vertex Legal Solutions "
                "governs the exchange of confidential information for purposes of exploring "
                "an AI-legal workflow integration partnership. The agreement has a 3-year term "
                "with 5-year post-termination confidentiality obligations. Notable risk areas "
                "include a broad IP assignment clause (Section 5.2) and a perpetual license "
                "grant that may unintentionally cover derivative works."
            ),
        )
        db.add(nda)
        await db.flush()

        nda_clauses = [
            {
                "clause_index": 0,
                "section_heading": "Section 1 — Purpose",
                "clause_text": (
                    "The Parties wish to explore a potential business relationship concerning "
                    "the integration of artificial intelligence tools into legal workflow systems "
                    "(the \"Purpose\"). In connection with the Purpose, each Party may disclose "
                    "to the other certain confidential and proprietary information."
                ),
                "clause_type": "purpose",
                "risk_score": 0.08,
                "risk_level": "low",
                "risk_category": "general",
                "explanation": (
                    "Standard purpose clause with a narrowly defined scope. The defined Purpose "
                    "is specific and does not create broad obligations. Low risk."
                ),
                "suggestion": None,
            },
            {
                "clause_index": 1,
                "section_heading": "Section 3 — Obligations of the Receiving Party",
                "clause_text": (
                    "The receiving Party shall hold the Confidential Information in strict "
                    "confidence; not disclose the Confidential Information to any third party "
                    "without prior written consent; use the Confidential Information solely for "
                    "the Purpose; and protect the Confidential Information using the same degree "
                    "of care it uses to protect its own confidential information, but in no event "
                    "less than reasonable care."
                ),
                "clause_type": "confidentiality",
                "risk_score": 0.22,
                "risk_level": "low",
                "risk_category": "confidentiality",
                "explanation": (
                    "Standard mutual confidentiality obligations with a reasonable care standard. "
                    "The obligations are symmetric and proportionate. Low risk for both parties."
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
                "clause_type": "ip_assignment",
                "risk_score": 0.78,
                "risk_level": "high",
                "risk_category": "ip_assignment",
                "explanation": (
                    "This IP assignment clause is unusually broad. It requires the receiving "
                    "party to assign ownership of ANY inventions that were merely created "
                    "\"using\" the disclosing party's information — even if the connection is "
                    "incidental. This could effectively transfer ownership of your core work "
                    "product if you use any of the other party's materials in development."
                ),
                "suggestion": (
                    "Limit the assignment to inventions that are directly derived from and "
                    "substantially incorporate the disclosing party's Confidential Information. "
                    "Add language: 'solely to the extent such inventions could not have been "
                    "created without the direct use of the Confidential Information.'"
                ),
            },
            {
                "clause_index": 3,
                "section_heading": "Section 6.2 — Survival",
                "clause_text": (
                    "The obligations of confidentiality set forth in this Agreement shall survive "
                    "termination for a period of five (5) years from the date of termination."
                ),
                "clause_type": "confidentiality",
                "risk_score": 0.35,
                "risk_level": "medium",
                "risk_category": "confidentiality",
                "explanation": (
                    "A 5-year post-termination confidentiality obligation is on the longer end "
                    "for an NDA of this type. Industry standard is typically 2-3 years. This "
                    "creates long-term obligations that may be difficult to monitor and enforce."
                ),
                "suggestion": (
                    "Consider negotiating down to 2-3 years post-termination, or carve out "
                    "trade secrets with perpetual protection while limiting general confidential "
                    "information obligations to 2 years."
                ),
            },
            {
                "clause_index": 4,
                "section_heading": "Section 7 — Remedies",
                "clause_text": (
                    "The Parties acknowledge that any breach of this Agreement may cause "
                    "irreparable harm to the disclosing Party for which monetary damages would "
                    "be an inadequate remedy. Accordingly, the disclosing Party shall be "
                    "entitled to seek equitable relief, including injunction and specific "
                    "performance, in addition to all other remedies available at law or in equity, "
                    "without the necessity of proving actual damages or posting any bond."
                ),
                "clause_type": "remedies",
                "risk_score": 0.42,
                "risk_level": "medium",
                "risk_category": "liability",
                "explanation": (
                    "This remedies clause allows the other party to seek injunctive relief "
                    "without proving actual damages or posting a bond — a significant litigation "
                    "advantage. Combined with the broad IP assignment in Section 5.2, this "
                    "creates meaningful litigation exposure."
                ),
                "suggestion": (
                    "Request a mutual application of this remedies clause and consider adding "
                    "a requirement for actual notice and a cure period before injunctive relief "
                    "can be sought."
                ),
            },
        ]

        for c in nda_clauses:
            clause = Clause(contract_id=nda.id, **c)
            db.add(clause)

        # ── Contract 2: SaaS Agreement with high risk ──────────────────────
        saas_filename = "demo_saas_techco.txt"
        saas = Contract(
            user_id=user.id,
            filename=saas_filename,
            original_filename="SaaS Master Agreement - TechCo LLC.txt",
            file_path=f"/app/uploads/{saas_filename}",
            file_type="txt",
            file_size_bytes=8900,
            title="Master SaaS Agreement — TechCo LLC",
            parties={"names": ["TechCo LLC", "Enterprise Client Corp."]},
            effective_date=date(2025, 6, 1),
            expiration_date=date(2026, 5, 31),
            governing_law="Delaware",
            contract_type="SaaS",
            overall_risk_score=0.74,
            risk_level="high",
            status="analyzed",
            summary=(
                "This Master SaaS Agreement between TechCo LLC and Enterprise Client Corp "
                "governs the provision of cloud software services. The agreement contains "
                "several high-risk provisions: a one-sided indemnification clause, auto-renewal "
                "with inadequate notice, uncapped liability for the vendor, and a data processing "
                "addendum that may not meet current CCPA/GDPR requirements. Immediate review "
                "of Sections 8, 11, and 14 is strongly recommended."
            ),
        )
        db.add(saas)
        await db.flush()

        saas_clauses = [
            {
                "clause_index": 0,
                "section_heading": "Section 2 — License Grant",
                "clause_text": (
                    "Subject to the terms of this Agreement and payment of all applicable fees, "
                    "TechCo hereby grants Enterprise Client a non-exclusive, non-transferable, "
                    "non-sublicensable, limited license to access and use the Service solely "
                    "for Enterprise Client's internal business purposes during the Subscription Term."
                ),
                "clause_type": "license",
                "risk_score": 0.15,
                "risk_level": "low",
                "risk_category": "ip_assignment",
                "explanation": "Standard SaaS license grant with appropriate restrictions. Low risk.",
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
                "risk_score": 0.91,
                "risk_level": "critical",
                "risk_category": "indemnification",
                "explanation": (
                    "This indemnification clause is critically one-sided. Enterprise Client bears "
                    "ALL indemnification obligations with NO reciprocal protection from TechCo. "
                    "The scope is extremely broad — covering 'any claim arising out of use of the "
                    "Service' — which could expose Enterprise Client even for TechCo's own service "
                    "failures or third-party IP infringement in TechCo's software. The explicit "
                    "carve-out ('TechCo shall have no indemnification obligations') removes any "
                    "ambiguity: you bear all risk."
                ),
                "suggestion": (
                    "Require mutual indemnification. TechCo should indemnify Enterprise Client for: "
                    "(a) TechCo's breach of the agreement; (b) TechCo's negligence or willful "
                    "misconduct; (c) third-party IP infringement claims arising from the Service "
                    "itself (not from Enterprise Client's modifications). Cap each party's "
                    "indemnification obligations at the fees paid in the prior 12 months."
                ),
            },
            {
                "clause_index": 2,
                "section_heading": "Section 11 — Auto-Renewal",
                "clause_text": (
                    "This Agreement shall automatically renew for successive one-year terms unless "
                    "either party provides written notice of non-renewal at least fifteen (15) days "
                    "prior to the end of the then-current Subscription Term. TechCo may adjust "
                    "pricing for any renewal term by providing notice no later than ten (10) days "
                    "prior to renewal."
                ),
                "clause_type": "auto_renewal",
                "risk_score": 0.82,
                "risk_level": "high",
                "risk_category": "termination",
                "explanation": (
                    "Two major risks here. First, the 15-day non-renewal notice window is "
                    "extremely short — for an enterprise SaaS contract, 60-90 days is standard, "
                    "giving adequate time to evaluate alternatives, migrate data, and make a "
                    "business decision. Missing this window locks you in for another full year. "
                    "Second, TechCo can adjust pricing with only 10 days notice before renewal, "
                    "leaving insufficient time to evaluate and respond to a price increase."
                ),
                "suggestion": (
                    "Negotiate for: (a) 90-day non-renewal notice window; (b) price increase "
                    "notice of at least 60 days prior to renewal, with a right to terminate "
                    "within 30 days if the price increase exceeds a pre-agreed threshold (e.g., "
                    "more than 5% above CPI). Add a data export right upon non-renewal."
                ),
            },
            {
                "clause_index": 3,
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
                "explanation": (
                    "This data provision creates significant compliance risk. There is no Data "
                    "Processing Agreement (DPA), which is required under GDPR Article 28 and "
                    "increasingly expected under CCPA. TechCo reserves the right to use your "
                    "data for 'marketing purposes' after anonymization — a broad carve-out that "
                    "may conflict with your own data use restrictions. Additionally, the Privacy "
                    "Policy can be changed unilaterally without notice, meaning your data "
                    "protection terms can shift without your consent."
                ),
                "suggestion": (
                    "Require a standalone Data Processing Agreement (DPA) that: (a) restricts "
                    "TechCo to processing data only on your instructions; (b) prohibits use of "
                    "your data for TechCo's own marketing; (c) requires notification of Privacy "
                    "Policy changes with 30-day advance notice and a right to terminate if "
                    "changes are material; (d) includes subprocessor lists and approval rights."
                ),
            },
            {
                "clause_index": 4,
                "section_heading": "Section 9 — Limitation of Liability",
                "clause_text": (
                    "IN NO EVENT SHALL TECHCO BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, "
                    "EXEMPLARY, CONSEQUENTIAL, OR PUNITIVE DAMAGES. TECHCO'S TOTAL CUMULATIVE "
                    "LIABILITY ARISING OUT OF OR RELATED TO THIS AGREEMENT SHALL NOT EXCEED THE "
                    "GREATER OF (A) THE FEES PAID BY ENTERPRISE CLIENT IN THE THREE (3) MONTHS "
                    "PRECEDING THE CLAIM, OR (B) ONE THOUSAND DOLLARS ($1,000)."
                ),
                "clause_type": "limitation_of_liability",
                "risk_score": 0.68,
                "risk_level": "high",
                "risk_category": "liability",
                "explanation": (
                    "TechCo's liability is capped at 3 months of fees or $1,000 — whichever is "
                    "greater. For an enterprise contract with annual fees potentially in the "
                    "hundreds of thousands, this cap is effectively de minimis. Combined with the "
                    "one-sided indemnification in Section 8, Enterprise Client bears essentially "
                    "unlimited risk while TechCo's exposure is capped at a token amount."
                ),
                "suggestion": (
                    "Negotiate a liability cap of at least 12 months of fees paid, with exceptions "
                    "for: (a) breaches of confidentiality; (b) indemnification obligations; "
                    "(c) gross negligence or willful misconduct; (d) data breaches. The current "
                    "$1,000 floor is commercially unreasonable for any meaningful enterprise deal."
                ),
            },
        ]

        for c in saas_clauses:
            clause = Clause(contract_id=saas.id, **c)
            db.add(clause)

        await db.commit()
        print(f"Seeded 2 demo contracts with {len(nda_clauses) + len(saas_clauses)} clauses.")
        print(f"\nDemo credentials:")
        print(f"  Email:    {DEMO_EMAIL}")
        print(f"  Password: {DEMO_PASSWORD}")
        print(f"\nOpen http://localhost:3000 and sign in to see the demo data.")


if __name__ == "__main__":
    asyncio.run(seed())
