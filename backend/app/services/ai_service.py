"""LLM provider abstraction layer (MISSION-05 §2).

Defines an abstract ``AIProvider`` base class and a concrete ``OpenAIProvider``.
To swap providers, create a new subclass and update ``get_ai_provider()``.

Module-level helper functions (``get_embedding``, ``get_completion``, …) are
kept as thin wrappers so every existing caller continues to work unchanged.
"""

import json
import logging
from abc import ABC, abstractmethod
from typing import AsyncGenerator

from openai import AsyncOpenAI

from app.config import settings

logger = logging.getLogger(__name__)


# ── Abstract provider ─────────────────────────────────────────────────────────

class AIProvider(ABC):
    """Abstract base class for AI providers."""

    @abstractmethod
    async def generate_embedding(self, text: str) -> list[float]:
        """Generate a vector embedding for a single text."""
        ...

    @abstractmethod
    async def generate_embeddings(self, texts: list[str]) -> list[list[float]]:
        """Generate vector embeddings for a batch of texts."""
        ...

    @abstractmethod
    async def complete(
        self, system_prompt: str, user_prompt: str,
        temperature: float = 0.3, max_tokens: int = 2000,
    ) -> str:
        """Generate a completion (non-streaming)."""
        ...

    @abstractmethod
    async def json_complete(
        self, system_prompt: str, user_prompt: str,
        temperature: float = 0.1, max_tokens: int = 2000,
    ) -> dict:
        """Generate a JSON-formatted completion."""
        ...

    @abstractmethod
    async def stream_complete(
        self, system_prompt: str, user_prompt: str,
        temperature: float = 0.3, max_tokens: int = 4000,
    ) -> AsyncGenerator[str, None]:
        """Generate a streaming completion, yielding tokens."""
        ...


# ── OpenAI implementation ─────────────────────────────────────────────────────

class OpenAIProvider(AIProvider):
    """OpenAI implementation of the AI provider."""

    def __init__(self) -> None:
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.embedding_model = settings.EMBEDDING_MODEL
        self.completion_model = settings.COMPLETION_MODEL

    async def generate_embedding(self, text: str) -> list[float]:
        response = await self.client.embeddings.create(
            model=self.embedding_model, input=text,
        )
        return response.data[0].embedding

    async def generate_embeddings(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        embeddings: list[list[float]] = []
        batch_size = 100
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            response = await self.client.embeddings.create(
                model=self.embedding_model, input=batch,
            )
            embeddings.extend([item.embedding for item in response.data])
        return embeddings

    async def complete(
        self, system_prompt: str, user_prompt: str,
        temperature: float = 0.3, max_tokens: int = 2000,
    ) -> str:
        response = await self.client.chat.completions.create(
            model=self.completion_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content or ""

    async def json_complete(
        self, system_prompt: str, user_prompt: str,
        temperature: float = 0.1, max_tokens: int = 2000,
    ) -> dict:
        response = await self.client.chat.completions.create(
            model=self.completion_model,
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

    async def stream_complete(
        self, system_prompt: str, user_prompt: str,
        temperature: float = 0.3, max_tokens: int = 4000,
    ) -> AsyncGenerator[str, None]:
        stream = await self.client.chat.completions.create(
            model=self.completion_model,
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


# ── Singleton factory ─────────────────────────────────────────────────────────

_ai_provider: AIProvider | None = None


def get_ai_provider() -> AIProvider:
    """Return the global AI provider instance (lazy-initialised)."""
    global _ai_provider
    if _ai_provider is None:
        _ai_provider = OpenAIProvider()
        logger.info("AI provider initialised: OpenAIProvider")
    return _ai_provider


# ── Backward-compatible module-level helpers ──────────────────────────────────
# All existing service code calls these functions — they delegate to the
# singleton provider so nothing else needs to change.


async def get_embedding(text: str) -> list[float]:
    """Generate a vector embedding for a single text string."""
    return await get_ai_provider().generate_embedding(text)


async def get_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """Generate vector embeddings for a batch of texts."""
    return await get_ai_provider().generate_embeddings(texts)


async def get_completion(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.2,
    max_tokens: int = 2000,
) -> str:
    """Get a single completion from the LLM."""
    return await get_ai_provider().complete(
        system_prompt, user_prompt, temperature=temperature, max_tokens=max_tokens,
    )


async def get_json_completion(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.1,
    max_tokens: int = 2000,
) -> dict:
    """Get a JSON-formatted completion from the LLM."""
    return await get_ai_provider().json_complete(
        system_prompt, user_prompt, temperature=temperature, max_tokens=max_tokens,
    )


async def stream_completion(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.3,
    max_tokens: int = 4000,
) -> AsyncGenerator[str, None]:
    """Stream a completion from the LLM, yielding text chunks."""
    async for token in get_ai_provider().stream_complete(
        system_prompt, user_prompt, temperature=temperature, max_tokens=max_tokens,
    ):
        yield token
