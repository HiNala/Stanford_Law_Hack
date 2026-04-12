"""RAG-powered chat service for asking questions about a specific contract."""

import uuid
from typing import AsyncGenerator

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.clause import Clause
from app.models.chat import ChatMessage
from app.models.contract import Contract
from app.services.ai_service import get_embedding, stream_completion

CHAT_SYSTEM_PROMPT = """You are ClauseGuard AI, functioning as a senior associate attorney reviewing a contract for a partner at a top corporate law firm. You specialize in M&A due diligence and commercial contract negotiation.

CONTRACT METADATA
{contract_meta}

RELEVANT CLAUSES (retrieved via semantic search for this question)
{context}

INSTRUCTIONS
- Lead with the direct answer, then support it with analysis
- Reference specific section headings and quote exact clause language when relevant
- Compare provisions to market standard where it adds value
  (e.g., "15-day termination notice is well below the 30-90 day standard for MSAs")
- Never fabricate contract language — only cite what appears in the context above
- If a clause relevant to the question is not in the context, say so honestly
- Use markdown: **bold** for key terms, bullet lists for multiple issues
- When discussing risk: quantify exposure, suggest specific alternative language
- Note when clauses interact with or potentially contradict each other
- Be thorough but concise — every word must earn its place"""


def _build_contract_meta(contract: Contract) -> str:
    """Build a concise contract metadata string for the chat prompt."""
    parties = "Unknown"
    if contract.parties and isinstance(contract.parties, dict):
        names = contract.parties.get("names", [])
        parties = " / ".join(names) if names else "Unknown"

    lines = [
        f"Title: {contract.title or contract.original_filename}",
        f"Type: {contract.contract_type or 'Unknown'}",
        f"Parties: {parties}",
        f"Governing Law: {contract.governing_law or 'Not specified'}",
        f"Effective: {contract.effective_date or 'Not specified'}",
        f"Expires: {contract.expiration_date or 'Not specified'}",
        f"Overall Risk: {contract.risk_level or 'N/A'} ({contract.overall_risk_score:.2f})"
        if contract.overall_risk_score is not None else f"Overall Risk: {contract.risk_level or 'N/A'}",
    ]
    return "\n".join(lines)


async def retrieve_relevant_clauses(
    db: AsyncSession,
    contract_id: uuid.UUID,
    query: str,
    top_k: int = 6,
) -> list[Clause]:
    """Retrieve the most semantically similar clauses to a query using pgvector.

    Falls back to highest-risk clauses when no embeddings exist (e.g. seeded demo contracts).
    """
    # Check if any clauses have embeddings for this contract
    count_result = await db.execute(
        select(Clause)
        .where(Clause.contract_id == contract_id)
        .where(Clause.embedding.isnot(None))
        .limit(1)
    )
    has_embeddings = count_result.scalar_one_or_none() is not None

    if has_embeddings:
        query_embedding = await get_embedding(query)
        result = await db.execute(
            select(Clause)
            .where(Clause.contract_id == contract_id)
            .where(Clause.embedding.isnot(None))
            .order_by(Clause.embedding.cosine_distance(query_embedding))
            .limit(top_k)
        )
    else:
        # No embeddings — fall back to highest-risk clauses as context
        result = await db.execute(
            select(Clause)
            .where(Clause.contract_id == contract_id)
            .order_by(Clause.risk_score.desc().nullslast())
            .limit(top_k)
        )
    return list(result.scalars().all())


async def chat_with_contract(
    db: AsyncSession,
    contract_id: uuid.UUID,
    user_id: uuid.UUID,
    message: str,
    prefetched_clauses: list["Clause"] | None = None,
) -> AsyncGenerator[str, None]:
    """
    RAG chat: build context from clauses (pre-fetched or freshly retrieved), stream the response.
    Accepts pre-fetched clauses from the router so the vector search only runs once per request.
    Stores both the user message and assistant response in the DB.
    """
    # Save user message
    user_msg = ChatMessage(
        contract_id=contract_id,
        user_id=user_id,
        role="user",
        content=message,
    )
    db.add(user_msg)
    await db.flush()

    # Fetch contract metadata for context
    contract_result = await db.execute(
        select(Contract).where(Contract.id == contract_id)
    )
    contract = contract_result.scalar_one_or_none()
    contract_meta = _build_contract_meta(contract) if contract else "Contract metadata unavailable."

    # Use pre-fetched clauses if provided; otherwise run the vector search
    clauses = prefetched_clauses if prefetched_clauses is not None else await retrieve_relevant_clauses(db, contract_id, message)

    context_parts = []
    clause_ids = []
    legal_citations: list[str] = []

    for clause in clauses:
        heading = f"[{clause.section_heading}]" if clause.section_heading else f"[Clause {clause.clause_index + 1}]"
        risk_tag = f"[{clause.risk_level.upper()}]" if clause.risk_level else ""
        type_tag = f"[{clause.clause_type}]" if clause.clause_type else ""
        header = f"--- {heading} {risk_tag} {type_tag}".rstrip()
        context_parts.append(f"{header}\n{clause.clause_text}")
        clause_ids.append(clause.id)

        # Collect TrustFoundry legal grounding from clause metadata
        meta = clause.metadata_ or {}
        grounding = meta.get("legal_grounding")
        if grounding and grounding.get("verified") and grounding.get("citations"):
            for cit in grounding["citations"][:2]:
                legal_citations.append(
                    f"• {cit['citation']}: {cit['summary'][:180]}"
                )

    context = "\n\n".join(context_parts) if context_parts else "No relevant clauses found in this contract."

    # Append verified legal citations to context when available
    legal_section = ""
    if legal_citations:
        seen = list(dict.fromkeys(legal_citations))  # deduplicate preserving order
        legal_section = (
            "\n\nVERIFIED LEGAL CONTEXT (sourced via TrustFoundry — 14M+ US laws & cases):\n"
            + "\n".join(seen[:4])
            + "\nCite these statutes and cases when directly relevant to the question."
        )

    system_prompt = CHAT_SYSTEM_PROMPT.format(
        contract_meta=contract_meta,
        context=context + legal_section,
    )

    # Stream assistant response
    full_response = ""
    async for chunk in stream_completion(system_prompt, message):
        full_response += chunk
        yield chunk

    # Save assistant message
    assistant_msg = ChatMessage(
        contract_id=contract_id,
        user_id=user_id,
        role="assistant",
        content=full_response,
        context_clause_ids=clause_ids,
    )
    db.add(assistant_msg)
    await db.flush()


async def get_chat_history(
    db: AsyncSession,
    contract_id: uuid.UUID,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[ChatMessage], int]:
    """Fetch chat messages for a contract with pagination, ordered chronologically."""
    from sqlalchemy import func

    count_result = await db.execute(
        select(func.count(ChatMessage.id)).where(ChatMessage.contract_id == contract_id)
    )
    total = count_result.scalar() or 0

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.contract_id == contract_id)
        .order_by(ChatMessage.created_at)
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all()), total
