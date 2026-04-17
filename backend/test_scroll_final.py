import asyncio
from app.core.database import vectorai_client

async def test():
    try:
        await vectorai_client._ensure_client()
        results = await vectorai_client.scroll_all(limit=5, with_vectors=True)
        print(f"Found {len(results)} snippets")
        if results:
            print(f"First snippet:")
            print(f"  ID: {results[0]['id']}")
            print(f"  Has vector: {results[0]['vector'] is not None}")
            if results[0]['vector']:
                print(f"  Vector length: {len(results[0]['vector'])}")
                print(f"  First 5 vector values: {results[0]['vector'][:5]}")
            print(f"  Payload keys: {list(results[0]['payload'].keys())}")
    except Exception as e:
        import traceback
        print(f"Error: {e}")
        traceback.print_exc()

asyncio.run(test())
