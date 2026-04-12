"""Split contract text into clause-level chunks for embedding and analysis."""

import re

import tiktoken

ENCODER = tiktoken.encoding_for_model("gpt-4o")

# Target chunk sizes in tokens
MIN_CHUNK_TOKENS = 80
MAX_CHUNK_TOKENS = 500

# Patterns that indicate section boundaries (must be at start of a paragraph)
SECTION_PATTERNS = [
    r"^(?:ARTICLE|Article|SECTION|Section)\s+[IVXLCDM\d]+[.\s]",
    r"^\d+\.\s+[A-Z]",
    r"^\d+\.\d+\s+[A-Z]",
    r"^\d+\)\s+[A-Z]",
    r"^[A-Z][A-Z\s]{4,40}$",  # ALL CAPS heading (not too long)
]

# Compiled for fast matching
_SECTION_RE = re.compile("|".join(SECTION_PATTERNS))


def count_tokens(text: str) -> int:
    """Count the number of tokens in a text string."""
    return len(ENCODER.encode(text))


def _extract_heading(para_text: str) -> str | None:
    """If this paragraph starts with a section heading, extract the first line."""
    first_line = para_text.split("\n")[0].strip()
    if first_line and _SECTION_RE.match(first_line):
        # Truncate to avoid overly long headings
        return first_line[:120]
    return None


def _split_by_paragraphs(text: str) -> list[tuple[int, str]]:
    """Split text into paragraphs, returning (start_offset, text) tuples."""
    paragraphs = []
    current_pos = 0
    for match in re.finditer(r"\n\s*\n", text):
        para_text = text[current_pos:match.start()].strip()
        if para_text:
            paragraphs.append((current_pos, para_text))
        current_pos = match.end()
    remaining = text[current_pos:].strip()
    if remaining:
        paragraphs.append((current_pos, remaining))
    return paragraphs


def chunk_contract_text(text: str) -> list[dict]:
    """
    Split contract text into clause-level chunks.

    Returns a list of dicts with keys:
      clause_index, clause_text, start_char, end_char, section_heading
    """
    paragraphs = _split_by_paragraphs(text)
    if not paragraphs:
        return []

    chunks = []
    current_chunk_text = ""
    current_start = paragraphs[0][0]
    current_heading: str | None = None
    chunk_index = 0

    for start_offset, para_text in paragraphs:
        detected_heading = _extract_heading(para_text)
        is_section_boundary = detected_heading is not None
        combined_tokens = (
            count_tokens(current_chunk_text + "\n\n" + para_text)
            if current_chunk_text
            else count_tokens(para_text)
        )

        if current_chunk_text and (is_section_boundary or combined_tokens > MAX_CHUNK_TOKENS):
            # Flush current chunk
            end_char = current_start + len(current_chunk_text)
            chunks.append({
                "clause_index": chunk_index,
                "clause_text": current_chunk_text.strip(),
                "start_char": current_start,
                "end_char": end_char,
                "section_heading": current_heading,
            })
            chunk_index += 1
            current_chunk_text = para_text
            current_start = start_offset
            current_heading = detected_heading
        else:
            if current_chunk_text:
                current_chunk_text += "\n\n" + para_text
            else:
                current_chunk_text = para_text
                current_start = start_offset
                if detected_heading:
                    current_heading = detected_heading

    # Flush last chunk
    if current_chunk_text.strip():
        end_char = current_start + len(current_chunk_text)
        chunks.append({
            "clause_index": chunk_index,
            "clause_text": current_chunk_text.strip(),
            "start_char": current_start,
            "end_char": end_char,
            "section_heading": current_heading,
        })

    return chunks
