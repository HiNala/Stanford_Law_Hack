"""Cross-document pattern detection service.

Analyzes patterns across multiple contracts to surface portfolio-level
insights that individual contract reviews would miss:
- Common risky clause types
- Outlier contracts with unusual provisions
- Aggregate statistics and distributions
"""

import uuid
import logging
from collections import Counter, defaultdict

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.contract import Contract
from app.models.clause import Clause

logger = logging.getLogger(__name__)

# Taxonomy categories that carry the most M&A deal risk
HIGH_IMPACT_CATEGORIES = {
    "change_of_control", "termination_convenience", "termination_cause",
    "indemnification", "limitation_of_liability", "non_compete",
    "non_solicitation", "ip_ownership", "exclusivity",
}


async def detect_cross_document_patterns(
    db: AsyncSession,
    user_id: uuid.UUID,
    contract_ids: list[uuid.UUID] | None = None,
) -> dict:
    """Analyze patterns across multiple contracts.

    If contract_ids is provided, scope analysis to those contracts.
    Otherwise, analyze all contracts belonging to the user.

    Returns:
        dict with keys: clause_type_distribution, risk_hotspots,
        governing_law_distribution, outliers, aggregate_stats, insights
    """
    # Build base query scoped to user
    base = select(Clause).join(Contract).where(Contract.user_id == user_id)
    if contract_ids:
        base = base.where(Contract.id.in_(contract_ids))

    result = await db.execute(
        base.where(Contract.status == "analyzed").order_by(Clause.clause_index)
    )
    clauses = list(result.scalars().all())

    # Fetch contracts for metadata
    contract_q = select(Contract).where(
        Contract.user_id == user_id,
        Contract.status == "analyzed",
    )
    if contract_ids:
        contract_q = contract_q.where(Contract.id.in_(contract_ids))
    contracts = list((await db.execute(contract_q)).scalars().all())

    if not clauses:
        return {
            "total_contracts": 0,
            "total_clauses": 0,
            "clause_type_distribution": {},
            "risk_hotspots": [],
            "governing_law_distribution": {},
            "outliers": [],
            "aggregate_stats": {},
            "insights": [],
        }

    # ── Clause type distribution ──────────────────────────────────────────
    type_counter: Counter = Counter()
    type_risk_scores: dict[str, list[float]] = defaultdict(list)
    risk_by_contract: dict[uuid.UUID, list[float]] = defaultdict(list)

    for c in clauses:
        ctype = c.clause_type or "general"
        type_counter[ctype] += 1
        if c.risk_score is not None:
            type_risk_scores[ctype].append(c.risk_score)
            risk_by_contract[c.contract_id].append(c.risk_score)

    clause_type_distribution = {
        ctype: {
            "count": count,
            "avg_risk": round(sum(type_risk_scores.get(ctype, [0])) / max(len(type_risk_scores.get(ctype, [1])), 1), 3),
        }
        for ctype, count in type_counter.most_common()
    }

    # ── Risk hotspots: clause types with highest average risk ─────────────
    risk_hotspots = []
    for ctype, scores in type_risk_scores.items():
        if len(scores) >= 1:
            avg = sum(scores) / len(scores)
            max_score = max(scores)
            critical_count = sum(1 for s in scores if s >= 0.7)
            if avg >= 0.4 or critical_count > 0:
                risk_hotspots.append({
                    "clause_type": ctype,
                    "count": len(scores),
                    "avg_risk_score": round(avg, 3),
                    "max_risk_score": round(max_score, 3),
                    "critical_count": critical_count,
                })
    risk_hotspots.sort(key=lambda x: x["avg_risk_score"], reverse=True)

    # ── Governing law distribution ────────────────────────────────────────
    gov_law_counter: Counter = Counter()
    for contract in contracts:
        law = contract.governing_law or "Not specified"
        gov_law_counter[law] += 1

    governing_law_distribution = dict(gov_law_counter.most_common())

    # ── Outlier detection ─────────────────────────────────────────────────
    outliers = []
    contract_map = {c.id: c for c in contracts}

    for contract_id, scores in risk_by_contract.items():
        contract = contract_map.get(contract_id)
        if not contract:
            continue
        avg = sum(scores) / len(scores)
        critical = sum(1 for s in scores if s >= 0.7)
        title = contract.title or contract.original_filename

        if critical >= 3:
            outliers.append({
                "contract_id": str(contract_id),
                "title": title,
                "reason": f"{critical} critical-risk clauses detected",
                "severity": "critical",
            })
        elif avg > 0.6:
            outliers.append({
                "contract_id": str(contract_id),
                "title": title,
                "reason": f"Average clause risk score of {avg:.0%} — significantly above portfolio average",
                "severity": "high",
            })

    # ── Aggregate stats ───────────────────────────────────────────────────
    all_scores = [c.risk_score for c in clauses if c.risk_score is not None]
    level_counter = Counter(c.risk_level for c in clauses if c.risk_level)

    aggregate_stats = {
        "total_contracts": len(contracts),
        "total_clauses": len(clauses),
        "avg_clause_risk": round(sum(all_scores) / max(len(all_scores), 1), 3),
        "risk_distribution": {
            "critical": level_counter.get("critical", 0),
            "high": level_counter.get("high", 0),
            "medium": level_counter.get("medium", 0),
            "low": level_counter.get("low", 0),
        },
        "high_impact_clause_count": sum(
            1 for c in clauses
            if (c.clause_type or "general") in HIGH_IMPACT_CATEGORIES
        ),
    }

    # ── Natural-language insights ─────────────────────────────────────────
    insights = _generate_insights(
        clauses, contracts, type_counter, type_risk_scores, governing_law_distribution
    )

    return {
        "total_contracts": len(contracts),
        "total_clauses": len(clauses),
        "clause_type_distribution": clause_type_distribution,
        "risk_hotspots": risk_hotspots,
        "governing_law_distribution": governing_law_distribution,
        "outliers": outliers,
        "aggregate_stats": aggregate_stats,
        "insights": insights,
    }


def _generate_insights(
    clauses: list,
    contracts: list,
    type_counter: Counter,
    type_risk_scores: dict[str, list[float]],
    gov_law: dict,
) -> list[str]:
    """Generate human-readable insight strings from the pattern data."""
    insights = []
    total = len(contracts)
    if total == 0:
        return insights

    # Change-of-control prevalence
    coc_count = type_counter.get("change_of_control", 0)
    if coc_count > 0:
        insights.append(
            f"{coc_count} of {total} contracts contain change-of-control termination clauses — "
            f"flag for M&A due diligence"
        )

    # Indemnification analysis
    indem_scores = type_risk_scores.get("indemnification", [])
    if indem_scores:
        avg_indem = sum(indem_scores) / len(indem_scores)
        critical_indem = sum(1 for s in indem_scores if s >= 0.7)
        if critical_indem > 0:
            insights.append(
                f"{critical_indem} of {len(indem_scores)} indemnification clauses score critical-risk "
                f"(avg score: {avg_indem:.0%})"
            )

    # Non-compete analysis
    nc_count = type_counter.get("non_compete", 0) + type_counter.get("non_solicitation", 0)
    if nc_count > 0:
        nc_scores = type_risk_scores.get("non_compete", []) + type_risk_scores.get("non_solicitation", [])
        high_nc = sum(1 for s in nc_scores if s >= 0.5)
        if high_nc > 0:
            insights.append(
                f"{nc_count} contracts have non-compete/non-solicitation provisions, "
                f"{high_nc} scoring high or critical risk"
            )

    # Governing law concentration
    if gov_law:
        top_law = max(gov_law, key=gov_law.get)
        pct = round(gov_law[top_law] / total * 100)
        if pct < 100:
            insights.append(
                f"Governing law distribution: {pct}% {top_law}"
                + "".join(f", {round(v/total*100)}% {k}" for k, v in gov_law.items() if k != top_law)
            )

    # IP ownership concerns
    ip_scores = type_risk_scores.get("ip_ownership", [])
    if ip_scores:
        risky_ip = sum(1 for s in ip_scores if s >= 0.5)
        if risky_ip > 0:
            insights.append(
                f"{risky_ip} of {len(ip_scores)} IP ownership clauses require review — "
                f"potential assignment or license-back risks"
            )

    return insights
