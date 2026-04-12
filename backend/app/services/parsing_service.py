"""Extract text from uploaded contract files (PDF, DOCX, TXT)."""

import os

import fitz  # pymupdf
from docx import Document


def extract_text_from_pdf(file_path: str) -> str:
    """Extract all text from a PDF file using PyMuPDF."""
    doc = fitz.open(file_path)
    pages = []
    for page in doc:
        pages.append(page.get_text("text"))
    doc.close()
    return "\n\n".join(pages)


def extract_text_from_docx(file_path: str) -> str:
    """Extract all text from a DOCX file."""
    doc = Document(file_path)
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n\n".join(paragraphs)


def extract_text_from_txt(file_path: str) -> str:
    """Read text from a plain TXT file."""
    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        return f.read()


def extract_text(file_path: str, file_type: str) -> str:
    """Route to the appropriate text extractor based on file type."""
    extractors = {
        "pdf": extract_text_from_pdf,
        "docx": extract_text_from_docx,
        "txt": extract_text_from_txt,
    }
    extractor = extractors.get(file_type.lower())
    if not extractor:
        raise ValueError(f"Unsupported file type: {file_type}")
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
    return extractor(file_path)
