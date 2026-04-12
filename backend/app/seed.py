"""Database seeder — creates a demo user for quick hackathon testing."""

import asyncio
import logging

from app.database import engine, Base, async_session_factory
from app.services.auth_service import create_user, get_user_by_email

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DEMO_EMAIL = "demo@clauseguard.ai"
DEMO_PASSWORD = "hackathon2026"
DEMO_NAME = "Demo User"


async def seed():
    """Create tables and seed demo data."""
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created.")

    # Seed demo user
    async with async_session_factory() as db:
        existing = await get_user_by_email(db, DEMO_EMAIL)
        if existing:
            logger.info(f"Demo user already exists: {DEMO_EMAIL}")
        else:
            user = await create_user(db, DEMO_EMAIL, DEMO_PASSWORD, DEMO_NAME)
            await db.commit()
            logger.info(f"Demo user created: {DEMO_EMAIL} / {DEMO_PASSWORD}")


if __name__ == "__main__":
    asyncio.run(seed())
