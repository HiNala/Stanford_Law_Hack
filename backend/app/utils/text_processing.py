"""Text processing utilities for contract text cleaning."""

import re


def clean_text(text: str) -> str:
    """Clean extracted text by normalizing whitespace and removing artifacts."""
    text = re.sub(r"\r\n", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = text.strip()
    return text


def truncate_text(text: str, max_chars: int = 8000) -> str:
    """Truncate text to a maximum number of characters, breaking at sentence boundaries."""
    if len(text) <= max_chars:
        return text
    truncated = text[:max_chars]
    last_period = truncated.rfind(".")
    if last_period > max_chars * 0.8:
        return truncated[: last_period + 1]
    return truncated
