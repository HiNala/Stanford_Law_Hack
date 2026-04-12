"""Structured application exceptions with error codes per MISSION-04 §1.3."""

from fastapi import HTTPException


class AppException(HTTPException):
    """
    Application-level exception that includes a machine-readable error_code
    and optional per-field validation errors.

    The custom exception handler in main.py serialises these into:
    {
        "detail": "...",
        "status_code": 400,
        "error_code": "VALIDATION_ERROR",
        "errors": [{"field": "email", "message": "..."}]
    }
    """

    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: str = "UNKNOWN_ERROR",
        errors: list[dict] | None = None,
    ):
        super().__init__(status_code=status_code, detail=detail)
        self.error_code = error_code
        self.errors = errors or []
