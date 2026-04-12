"""RAG-powered chat service for asking questions about a specific contract."""

import uuid
from typing import AsyncGenerator

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.clause import Clause
from app.models.chat import ChatMessage
from app.services.ai_service import get_embedding, stream_completion

CHAT_SYSTEM_PROMPT = """You are ClauseGuard AI, a legal contract analyst assistant. You have been given relevant clauses from a contract as context. Answer the user's question based on this context.

Rules:
- Be precise and cite specific clause language when relevant
- Use plain English — avoid unnecessary legal jargon
- If the context doesn't contain enough information to answer, say so clearly
- Always indicate when you are making an inference vs stating what the contract says
- Format your response with markdown for readability

Context clauses:
{context}"""


async def retrieve_relevant_clauses(
    db: AsyncSession,
    contract_id: uuid.UUID,
    query: str,
    top_k: int = 5,
) -> list[Clause]:
    """Retrieve the most semantically similar clauses to a query using pgvector."""
    query_embedding = await get_embedding(query)

    result = await db.execute(
        select(Clause)
        .where(Clause.contract_id == contract_id)
        .where(Clause.embedding.isnot(None))
        .order_by(Clause.embedding.cosine_distance(query_embedding))
        .limit(top_k)
    )
    return list(result.scalars().all())


async def chat_with_contract(
    db: AsyncSession,
    contract_id: uuid.UUID,
    user_id: uuid.UUID,
    message: str,
) -> AsyncGenerator[str, None]:
    """
    RAG chat: embed the question, retrieve relevant clauses, stream the response.
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

    # Retrieve relevant clauses
    clauses = await retrieve_relevant_clauses(db, contract_id, message)

    context_parts = []
    clause_ids = []
    for i, clause in enumerate(clauses, 1):
        heading = f"[Section: {clause.section_heading}]" if clause.section_heading else ""
        risk_tag = f"[Risk: {clause.risk_level}]" if clause.risk_level else ""
        context_parts.append(
            f"Clause {i} {heading} {risk_tag}:\n{clause.clause_text}"
        )
        clause_ids.append(clause.id)

    context = "\n\n---\n\n".join(context_parts) if context_parts else "No relevant clauses found."

    system_prompt = CHAT_SYSTEM_PROMPT.format(context=context)

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
) -> list[ChatMessage]:
    """Fetch all chat messages for a contract, ordered chronologically."""
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.contract_id == contract_id)
        .order_by(ChatMessage.created_at)
    )
    return list(result.scalars().all())
