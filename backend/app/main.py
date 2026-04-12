"""FastAPI application entry point — CORS, router mounting, startup events."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import auth, contracts, clauses, analysis, chat, search

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="ClauseGuard API",
    description="AI-Powered Contract Intelligence Platform",
    version="0.1.0",
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


@app.on_event("startup")
async def startup():
    """Create database tables on startup."""
    logger.info("Creating database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables ready.")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "clauseguard-api"}
