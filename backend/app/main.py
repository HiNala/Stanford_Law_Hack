"""FastAPI application entry point — CORS, router mounting, startup events."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
# Import all models so SQLAlchemy registers them before create_all
from app.models import User, Contract, Clause, ChatMessage  # noqa: F401
from app.routers import auth, contracts, clauses, analysis, chat, search

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
)

# CORS — allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(auth.router, prefix="/api")
app.include_router(contracts.router, prefix="/api")
app.include_router(clauses.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(search.router, prefix="/api")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "clauseguard-api"}


@app.get("/api/v1/health")
async def health_check_v1():
    """Health check endpoint (v1 path for spec compliance)."""
    return {"status": "healthy", "version": "0.1.0", "service": "clauseguard-api"}
