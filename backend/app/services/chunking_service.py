"""Split contract text into clause-level chunks for embedding and analysis."""

import re

import tiktoken

ENCODER = tiktoken.encoding_for_model("gpt-4o")

# Target chunk sizes in tokens
MIN_CHUNK_TOKENS = 80
MAX_CHUNK_TOKENS = 500

# Patterns that indicate section boundaries
SECTION_PATTERNS = [
    r"(?m)^(?:ARTICLE|Article|SECTION|Section)\s+[IVXLCDM\d]+",
    r"(?m)^\d+\.\d*\s+[A-Z]",
    r"(?m)^\d+\)\s+",
    r"(?m)^[A-Z][A-Z\s]{5,}$",
]


def count_tokens(text: str) -> int:
    """Count the number of tokens in a text string."""
    return len(ENCODER.encode(text))


def _find_section_breaks(text: str) -> list[int]:
    """Find character offsets of section boundaries in the text."""
    breaks = set()
    for pattern in SECTION_PATTERNS:
        for match in re.finditer(pattern, text):
            breaks.add(match.start())
    return sorted(breaks)


def _split_by_paragraphs(text: str) -> list[tuple[int, str]]:
    """Split text into paragraphs, returning (start_offset, text) tuples."""
    paragraphs = []
    current_pos = 0
    for match in re.finditer(r"\n\s*\n", text):
        para_text = text[current_pos:match.start()].strip()
        if para_text:
            paragraphs.append((current_pos, para_text))
        current_pos = match.end()
    # Last paragraph
    remaining = text[current_pos:].strip()
    if remaining:
        paragraphs.append((current_pos, remaining))
    return paragraphs


def chunk_contract_text(text: str) -> list[dict]:
    """
    Split contract text into clause-level chunks.

    Returns a list of dicts with keys: clause_index, clause_text, start_char, end_char
    """
    paragraphs = _split_by_paragraphs(text)
    if not paragraphs:
        return []

    chunks = []
    current_chunk_text = ""
    current_start = paragraphs[0][0]
    chunk_index = 0

    section_breaks = set(_find_section_breaks(text))

    for start_offset, para_text in paragraphs:
        is_section_boundary = start_offset in section_breaks
        combined_tokens = count_tokens(current_chunk_text + "\n\n" + para_text) if current_chunk_text else count_tokens(para_text)

        if current_chunk_text and (is_section_boundary or combined_tokens > MAX_CHUNK_TOKENS):
            # Flush current chunk
            end_char = current_start + len(current_chunk_text)
            chunks.append({
                "clause_index": chunk_index,
                "clause_text": current_chunk_text.strip(),
                "start_char": current_start,
                "end_char": end_char,
            })
            chunk_index += 1
            current_chunk_text = para_text
            current_start = start_offset
        else:
            if current_chunk_text:
                current_chunk_text += "\n\n" + para_text
            else:
                current_chunk_text = para_text
                current_start = start_offset

    # Flush last chunk
    if current_chunk_text.strip():
        end_char = current_start + len(current_chunk_text)
        chunks.append({
            "clause_index": chunk_index,
            "clause_text": current_chunk_text.strip(),
            "start_char": current_start,
            "end_char": end_char,
        })

    return chunks
