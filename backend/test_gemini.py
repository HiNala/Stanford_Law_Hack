"""Quick smoke test — verifies active AI provider (OpenAI or Gemini)."""
import asyncio, sys
sys.path.insert(0, '/app')

async def main():
    from app.services.ai_service import get_ai_provider
    p = get_ai_provider()
    print(f"Provider: {type(p).__name__}")

    # Test embedding
    try:
        emb = await p.generate_embedding("termination for convenience clause")
        print(f"Embedding OK: {len(emb)} dims")
    except Exception as e:
        print(f"Embedding FAIL: {e}")

    # Test JSON completion
    try:
        r = await p.json_complete(
            "You are a contract analyst.",
            'Return exactly this JSON: {"status": "ok", "risk": "low"}'
        )
        print(f"JSON completion OK: {r}")
    except Exception as e:
        print(f"JSON completion FAIL: {e}")

asyncio.run(main())
