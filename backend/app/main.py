"""FastAPI application entry point — CORS, router mounting, startup events."""

import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.exceptions import AppException

from app.database import engine, Base, async_session_factory
# Import all models so SQLAlchemy registers them before create_all
from app.models import User, Contract, Clause, ChatMessage  # noqa: F401
from app.routers import auth, contracts, clauses, analysis, chat, search, stats

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create database tables on startup."""
    logger.info("Creating database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables ready.")
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title="ClauseGuard API",
    description="AI-Powered Contract Intelligence Platform",
    version="0.1.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

# ── Structured error handler (MISSION-04 §1.3) ─────────────────────────────
@app.exception_handler(AppException)
async def app_exception_handler(_request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "status_code": exc.status_code,
            "error_code": exc.error_code,
            "errors": exc.errors,
        },
    )


# CORS — allow any localhost port (dev uses 3000-3010 range depending on availability)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
    ],
    allow_origin_regex=r"http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers — v1 API
V1 = "/api/v1"
app.include_router(auth.router, prefix=V1)
app.include_router(contracts.router, prefix=V1)
app.include_router(clauses.router, prefix=V1)
app.include_router(analysis.router, prefix=V1)
app.include_router(chat.router, prefix=V1)
app.include_router(search.router, prefix=V1)
app.include_router(stats.router, prefix=V1)

# Also mount at /api for backwards compat (frontend proxy)
app.include_router(auth.router, prefix="/api", include_in_schema=False)
app.include_router(contracts.router, prefix="/api", include_in_schema=False)
app.include_router(clauses.router, prefix="/api", include_in_schema=False)
app.include_router(analysis.router, prefix="/api", include_in_schema=False)
app.include_router(chat.router, prefix="/api", include_in_schema=False)
app.include_router(search.router, prefix="/api", include_in_schema=False)
app.include_router(stats.router, prefix="/api", include_in_schema=False)


@app.get("/health")
@app.get("/api/health", include_in_schema=False)
@app.get("/api/v1/health", include_in_schema=False)
async def health_check():
    """Health check endpoint with database connectivity status."""
    db_status = "connected"
    try:
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
    except Exception:
        db_status = "disconnected"
    return {
        "status": "healthy",
        "version": "0.1.0",
        "database": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
