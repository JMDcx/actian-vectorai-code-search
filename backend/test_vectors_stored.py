import asyncio
import random
from actian_vectorai import AsyncVectorAIClient
from app.core.config import settings

async def test():
    client = AsyncVectorAIClient(settings.vectorai_endpoint)
    await client.__aenter__()

    try:
        # Get a few points WITH vectors
        results = await client.points.scroll(
            settings.vectorai_collection,
            limit=5,
            with_payload=True,
            with_vectors=True  # Explicitly request vectors
        )

        points, offset = results
        print(f"Retrieved {len(points)} points")
        print(f"First point: {points[0]}")
        print(f"Has vectors attribute: {hasattr(points[0], 'vector')}")
        if hasattr(points[0], 'vector'):
            print(f"Vector value: {points[0].vector}")
            if points[0].vector:
                print(f"Vector length: {len(points[0].vector)}")
            else:
                print("Vector is None/empty!")

    finally:
        await client.__aexit__(None, None, None)

asyncio.run(test())
