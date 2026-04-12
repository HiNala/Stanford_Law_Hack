"""Database seeder — creates a demo user and pre-loads analyzed sample contracts.

Run with: python -m app.seed
(Requires the database to be running and OPENAI_API_KEY to be set.)
"""

import asyncio
import logging
import os
import shutil
import uuid
from pathlib import Path

from sqlalchemy import select, func, update
from app.database import engine, Base, async_session_factory
from app.models.contract import Contract as ContractModel
from app.services.auth_service import create_user, get_user_by_email
from app.services.contract_service import create_contract, process_contract

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DEMO_EMAIL = "demo@clauseguard.ai"
DEMO_PASSWORD = "hackathon2026"
DEMO_NAME = "Demo User"

SAMPLE_CONTRACTS_DIR = Path(__file__).parent.parent / "sample_contracts"
UPLOADS_DIR = Path(os.getenv("UPLOAD_DIR", "/app/uploads"))

DEMO_CONTRACTS = [
    {
        "filename": "acme_vendor_msa.txt",
        "display_name": "Acme Corporation — Master Services Agreement",
    },
    {
        "filename": "techcorp_mutual_nda.txt",
        "display_name": "InnovateTech / Meridian Capital — Mutual NDA",
    },
    {
        "filename": "cloudsaas_subscription.txt",
        "display_name": "CloudStack Technologies — SaaS Subscription Agreement",
    },
]


async def seed():
    """Create tables, seed demo user, and load pre-analyzed demo contracts."""
    # Ensure upload directory exists
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created.")

    # Seed demo user
    async with async_session_factory() as db:
        existing_user = await get_user_by_email(db, DEMO_EMAIL)
        if existing_user:
            logger.info(f"Demo user already exists: {DEMO_EMAIL}")
            demo_user = existing_user
        else:
            demo_user = await create_user(db, DEMO_EMAIL, DEMO_PASSWORD, DEMO_NAME)
            await db.commit()
            logger.info(f"Demo user created: {DEMO_EMAIL} / {DEMO_PASSWORD}")

        # Check if contracts already loaded
        count_result = await db.execute(
            select(func.count()).select_from(ContractModel).where(ContractModel.user_id == demo_user.id)
        )
        existing_count = count_result.scalar() or 0

        if existing_count >= len(DEMO_CONTRACTS):
            logger.info(f"Demo contracts already loaded ({existing_count} contracts found). Skipping.")
            return

        logger.info(f"Loading {len(DEMO_CONTRACTS)} demo contracts...")

        for contract_info in DEMO_CONTRACTS:
            sample_path = SAMPLE_CONTRACTS_DIR / contract_info["filename"]
            if not sample_path.exists():
                logger.warning(f"Sample contract not found: {sample_path}")
                continue

            # Copy to uploads directory with unique name
            unique_name = f"{uuid.uuid4().hex}_{contract_info['filename']}"
            dest_path = UPLOADS_DIR / unique_name
            shutil.copy2(sample_path, dest_path)

            # Detect file type
            ext = sample_path.suffix.lstrip(".").lower()
            file_type = "txt" if ext == "txt" else ext
            file_size = sample_path.stat().st_size

            # Create contract record
            contract = await create_contract(
                db=db,
                user_id=demo_user.id,
                filename=unique_name,
                original_filename=contract_info["filename"],
                file_path=str(dest_path),
                file_type=file_type,
                file_size_bytes=file_size,
            )
            await db.flush()

            logger.info(f"Processing contract: {contract_info['display_name']} ({contract.id})")
            try:
                await process_contract(db, contract.id)
                # Re-fetch the contract after processing, since extract_contract_metadata
                # may have overwritten the title with the AI-extracted one. Always use our
                # curated display names for a polished demo.
                fresh_result = await db.execute(
                    select(ContractModel).where(ContractModel.id == contract.id)
                )
                fresh_contract = fresh_result.scalar_one_or_none()
                if fresh_contract:
                    fresh_contract.title = contract_info["display_name"]
                await db.commit()
                logger.info(f"  ✓ Analyzed: {contract_info['display_name']}")
            except Exception as e:
                logger.error(f"  ✗ Failed to analyze {contract_info['display_name']}: {e}")
                await db.rollback()
                # Re-get the session state after rollback
                async with async_session_factory() as fresh_db:
                    await fresh_db.execute(
                        update(ContractModel)
                        .where(ContractModel.id == contract.id)
                        .values(status="error")
                    )
                    await fresh_db.commit()

    logger.info("Seeding complete.")
    logger.info(f"Login: {DEMO_EMAIL} / {DEMO_PASSWORD}")


if __name__ == "__main__":
    asyncio.run(seed())
