import asyncio
from app.core.database import vectorai_client

async def test():
    try:
        await vectorai_client._ensure_client()
        results = await vectorai_client.scroll_all(limit=10, with_vectors=False)
        print(f"Found {len(results)} snippets")
        if results:
            print(f"First result:")
            print(f"  ID: {results[0]['id']}")
            print(f"  Payload keys: {list(results[0]['payload'].keys())}")
            print(f"  Code type: {results[0]['payload'].get('code_type')}")
            print(f"  File: {results[0]['payload'].get('file_path')}")
    except Exception as e:
        import traceback
        print(f"Error: {e}")
        traceback.print_exc()

asyncio.run(test())
