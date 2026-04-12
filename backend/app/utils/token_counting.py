"""Token counting utilities for chunking and prompt management."""

import tiktoken

_encoder = tiktoken.encoding_for_model("gpt-4o")


def count_tokens(text: str) -> int:
    """Count the number of tokens in a text string."""
    return len(_encoder.encode(text))


def trim_to_token_limit(text: str, max_tokens: int = 4000) -> str:
    """Trim text to stay within a token limit."""
    tokens = _encoder.encode(text)
    if len(tokens) <= max_tokens:
        return text
    return _encoder.decode(tokens[:max_tokens])
