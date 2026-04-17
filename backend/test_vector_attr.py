import asyncio
from actian_vectorai import AsyncVectorAIClient
from app.core.config import settings

async def test():
    client = AsyncVectorAIClient(settings.vectorai_endpoint)
    await client.__aenter__()

    try:
        results = await client.points.scroll(
            settings.vectorai_collection,
            limit=2,
            with_payload=True,
            with_vectors=True
        )

        points, offset = results
        point = points[0]

        print(f"Point type: {type(point)}")
        print(f"Dir: {[x for x in dir(point) if not x.startswith('_')]}")
        print(f"Has 'vector': {hasattr(point, 'vector')}")
        print(f"Has 'vectors': {hasattr(point, 'vectors')}")

        # Try different ways to access
        if hasattr(point, 'vectors'):
            print(f"vectors value: {point.vectors}")
        if hasattr(point, 'vector'):
            print(f"vector value: {point.vector}")

        # Check if it's a property
        import inspect
        for attr in ['vector', 'vectors']:
            if hasattr(point, attr):
                prop = getattr(type(point), attr, None)
                if isinstance(prop, property):
                    print(f"{attr} is a property")
                else:
                    print(f"{attr} is a regular attribute")

    finally:
        await client.__aexit__(None, None, None)

asyncio.run(test())
