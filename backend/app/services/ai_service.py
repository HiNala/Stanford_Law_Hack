"""LLM provider abstraction layer — wraps OpenAI calls for embeddings and completions."""

import json
from typing import AsyncGenerator

from openai import AsyncOpenAI

from app.config import settings

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


async def get_embedding(text: str) -> list[float]:
    """Generate a vector embedding for a single text string."""
    response = await client.embeddings.create(
        model=settings.EMBEDDING_MODEL,
        input=text,
    )
    return response.data[0].embedding


async def get_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """Generate vector embeddings for a batch of texts."""
    if not texts:
        return []
    response = await client.embeddings.create(
        model=settings.EMBEDDING_MODEL,
        input=texts,
    )
    return [item.embedding for item in response.data]


async def get_completion(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.2,
    max_tokens: int = 2000,
) -> str:
    """Get a single completion from the LLM."""
    response = await client.chat.completions.create(
        model=settings.COMPLETION_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content or ""


async def get_json_completion(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.1,
    max_tokens: int = 2000,
) -> dict:
    """Get a JSON-formatted completion from the LLM."""
    response = await client.chat.completions.create(
        model=settings.COMPLETION_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
        response_format={"type": "json_object"},
    )
    content = response.choices[0].message.content or "{}"
    return json.loads(content)


async def stream_completion(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.3,
    max_tokens: int = 4000,
) -> AsyncGenerator[str, None]:
    """Stream a completion from the LLM, yielding text chunks."""
    stream = await client.chat.completions.create(
        model=settings.COMPLETION_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
        stream=True,
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta
