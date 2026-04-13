"""LLM provider abstraction layer (MISSION-05 §2).

Defines an abstract ``AIProvider`` base class and a concrete ``OpenAIProvider``.
To swap providers, create a new subclass and update ``get_ai_provider()``.

Module-level helper functions (``get_embedding``, ``get_completion``, …) are
kept as thin wrappers so every existing caller continues to work unchanged.
"""

import asyncio
import json
import logging
from abc import ABC, abstractmethod
from typing import AsyncGenerator

import httpx
from openai import AsyncOpenAI, RateLimitError, APIStatusError

from app.config import settings

logger = logging.getLogger(__name__)


async def _with_backoff(coro_fn, max_retries: int = 4, base_delay: float = 2.0):
    """Call an async coroutine-factory with exponential backoff on 429 errors."""
    for attempt in range(max_retries):
        try:
            return await coro_fn()
        except (RateLimitError, APIStatusError) as exc:
            code = getattr(exc, "status_code", None)
            if code != 429 and not isinstance(exc, RateLimitError):
                raise
            if attempt == max_retries - 1:
                raise
            delay = base_delay * (2 ** attempt)
            logger.warning(f"OpenAI 429 rate-limited (attempt {attempt+1}/{max_retries}), retrying in {delay:.1f}s")
            await asyncio.sleep(delay)


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
        async def _call():
            response = await self.client.embeddings.create(
                model=self.embedding_model, input=text,
            )
            return response.data[0].embedding
        return await _with_backoff(_call)

    async def generate_embeddings(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        embeddings: list[list[float]] = []
        batch_size = 20  # smaller batches to stay under TPM limits
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            async def _call(b=batch):
                response = await self.client.embeddings.create(
                    model=self.embedding_model, input=b,
                )
                return [item.embedding for item in response.data]
            batch_result = await _with_backoff(_call)
            embeddings.extend(batch_result)
            if i + batch_size < len(texts):
                await asyncio.sleep(0.5)  # brief pause between embedding batches
        return embeddings

    async def complete(
        self, system_prompt: str, user_prompt: str,
        temperature: float = 0.3, max_tokens: int = 2000,
    ) -> str:
        async def _call():
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
        return await _with_backoff(_call)

    async def json_complete(
        self, system_prompt: str, user_prompt: str,
        temperature: float = 0.1, max_tokens: int = 2000,
    ) -> dict:
        async def _call():
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
        return await _with_backoff(_call)

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


# ── Gemini implementation (REST, no extra SDK) ────────────────────────────────

class GeminiProvider(AIProvider):
    """Google Gemini implementation via REST API using httpx."""

    GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta"
    CHAT_MODEL = "gemini-2.5-flash"
    # gemini-embedding-001 produces 768-dim; we pad to 1536 so pgvector schema stays unchanged
    EMBED_MODEL = "gemini-embedding-001"
    EMBED_DIM = 768
    TARGET_DIM = 1536

    def __init__(self) -> None:
        self._key = settings.GEMINI_API_KEY
        self._client = httpx.AsyncClient(timeout=120)

    def _pad(self, vec: list[float]) -> list[float]:
        """Zero-pad a 768-dim vector to TARGET_DIM so it fits vector(1536)."""
        if len(vec) >= self.TARGET_DIM:
            return vec[: self.TARGET_DIM]
        return vec + [0.0] * (self.TARGET_DIM - len(vec))

    async def generate_embedding(self, text: str) -> list[float]:
        url = f"{self.GEMINI_BASE}/models/{self.EMBED_MODEL}:embedContent?key={self._key}"
        body = {
            "model": f"models/{self.EMBED_MODEL}",
            "content": {"parts": [{"text": text[:8000]}]},  # stay within token limit
        }
        r = await self._client.post(url, json=body)
        r.raise_for_status()
        vec = r.json()["embedding"]["values"]
        return self._pad(vec)

    async def generate_embeddings(self, texts: list[str]) -> list[list[float]]:
        results = []
        for text in texts:
            results.append(await self.generate_embedding(text))
            await asyncio.sleep(0.1)
        return results

    async def complete(
        self, system_prompt: str, user_prompt: str,
        temperature: float = 0.3, max_tokens: int = 2000,
    ) -> str:
        url = f"{self.GEMINI_BASE}/models/{self.CHAT_MODEL}:generateContent?key={self._key}"
        body = {
            "contents": [{"role": "user", "parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]}],
            "generationConfig": {"temperature": temperature, "maxOutputTokens": max_tokens},
        }
        r = await self._client.post(url, json=body)
        r.raise_for_status()
        return r.json()["candidates"][0]["content"]["parts"][0]["text"]

    async def json_complete(
        self, system_prompt: str, user_prompt: str,
        temperature: float = 0.1, max_tokens: int = 2000,
    ) -> dict:
        full_prompt = (
            f"{system_prompt}\n\n{user_prompt}\n\n"
            "IMPORTANT: Respond ONLY with a valid JSON object. No markdown fences, no preamble."
        )
        url = f"{self.GEMINI_BASE}/models/{self.CHAT_MODEL}:generateContent?key={self._key}"
        body = {
            "contents": [{"role": "user", "parts": [{"text": full_prompt}]}],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
                "responseMimeType": "application/json",
            },
        }
        r = await self._client.post(url, json=body)
        r.raise_for_status()
        raw = r.json()["candidates"][0]["content"]["parts"][0]["text"]
        # Strip any accidental markdown fences
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw.strip())

    async def stream_complete(
        self, system_prompt: str, user_prompt: str,
        temperature: float = 0.3, max_tokens: int = 4000,
    ) -> AsyncGenerator[str, None]:
        # Gemini streaming via SSE
        url = f"{self.GEMINI_BASE}/models/{self.CHAT_MODEL}:streamGenerateContent?key={self._key}&alt=sse"
        body = {
            "contents": [{"role": "user", "parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]}],
            "generationConfig": {"temperature": temperature, "maxOutputTokens": max_tokens},
        }
        async with self._client.stream("POST", url, json=body) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if line.startswith("data: "):
                    chunk = line[6:]
                    if chunk == "[DONE]":
                        break
                    try:
                        data = json.loads(chunk)
                        text = data["candidates"][0]["content"]["parts"][0].get("text", "")
                        if text:
                            yield text
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue


# ── Hybrid provider — OpenAI primary, Gemini fallback ────────────────────────

_OPENAI_NONFATAL_CODES = {401, 403, 429}  # codes we fall back on rather than raise


class HybridProvider(AIProvider):
    """OpenAI for everything; auto-falls back to Gemini on auth/quota errors.

    Embeddings always use OpenAI (1536-dim, matches pgvector schema).
    Completions try OpenAI first; if that returns 401/403/quota the same
    request is retried against Gemini so no manual intervention is needed.
    """

    def __init__(self) -> None:
        self._openai = OpenAIProvider()
        self._gemini = GeminiProvider()

    # ── embeddings — OpenAI only (dimension-safe) ──────────────────────────
    async def generate_embedding(self, text: str) -> list[float]:
        return await self._openai.generate_embedding(text)

    async def generate_embeddings(self, texts: list[str]) -> list[list[float]]:
        return await self._openai.generate_embeddings(texts)

    # ── completions — OpenAI first, Gemini fallback ────────────────────────
    async def complete(self, system_prompt: str, user_prompt: str,
                       temperature: float = 0.3, max_tokens: int = 2000) -> str:
        try:
            return await self._openai.complete(system_prompt, user_prompt, temperature, max_tokens)
        except Exception as exc:
            code = getattr(exc, "status_code", None)
            if code in _OPENAI_NONFATAL_CODES or "quota" in str(exc).lower() or "scope" in str(exc).lower():
                logger.warning(f"OpenAI complete failed ({exc.__class__.__name__}), falling back to Gemini")
                return await self._gemini.complete(system_prompt, user_prompt, temperature, max_tokens)
            raise

    async def json_complete(self, system_prompt: str, user_prompt: str,
                            temperature: float = 0.1, max_tokens: int = 2000) -> dict:
        try:
            return await self._openai.json_complete(system_prompt, user_prompt, temperature, max_tokens)
        except Exception as exc:
            code = getattr(exc, "status_code", None)
            if code in _OPENAI_NONFATAL_CODES or "quota" in str(exc).lower() or "scope" in str(exc).lower():
                logger.warning(f"OpenAI json_complete failed ({exc.__class__.__name__}), falling back to Gemini")
                return await self._gemini.json_complete(system_prompt, user_prompt, temperature, max_tokens)
            raise

    async def stream_complete(self, system_prompt: str, user_prompt: str,
                              temperature: float = 0.3,
                              max_tokens: int = 4000) -> AsyncGenerator[str, None]:
        # Try OpenAI stream first; on failure buffer Gemini response and yield
        try:
            async for token in self._openai.stream_complete(system_prompt, user_prompt, temperature, max_tokens):
                yield token
        except Exception as exc:
            code = getattr(exc, "status_code", None)
            if code in _OPENAI_NONFATAL_CODES or "quota" in str(exc).lower() or "scope" in str(exc).lower():
                logger.warning(f"OpenAI stream failed ({exc.__class__.__name__}), falling back to Gemini")
                async for token in self._gemini.stream_complete(system_prompt, user_prompt, temperature, max_tokens):
                    yield token
            else:
                raise


# ── Singleton factory ─────────────────────────────────────────────────────────

_ai_provider: AIProvider | None = None


def get_ai_provider() -> AIProvider:
    """Return the global AI provider instance (lazy-initialised).

    - Both keys set → HybridProvider (OpenAI embeddings + Gemini completions)
    - Only Gemini   → GeminiProvider (all ops)
    - Only OpenAI   → OpenAIProvider (all ops)
    """
    global _ai_provider
    if _ai_provider is None:
        has_openai = bool(settings.OPENAI_API_KEY)
        has_gemini = bool(settings.GEMINI_API_KEY)
        if has_openai and has_gemini:
            _ai_provider = HybridProvider()
            logger.info("AI provider initialised: HybridProvider (OpenAI embeddings + Gemini completions)")
        elif has_gemini:
            _ai_provider = GeminiProvider()
            logger.info("AI provider initialised: GeminiProvider (gemini-2.0-flash)")
        else:
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
