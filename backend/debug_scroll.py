import asyncio
from actian_vectorai import AsyncVectorAIClient
from app.core.config import settings

async def debug_scroll():
    """Debug script to inspect raw scroll API response."""
    client = AsyncVectorAIClient(settings.vectorai_endpoint)
    await client.__aenter__()

    try:
        collection = settings.vectorai_collection
        print(f"Collection: {collection}")
        print(f"Endpoint: {settings.vectorai_endpoint}")

        # Check collection exists
        exists = await client.collections.exists(collection)
        print(f"Collection exists: {exists}")

        if exists:
            # Get collection info - try different methods
            try:
                info = await client.collections.get(collection)
                print(f"Collection info: {info}")
            except AttributeError:
                # Try getting info through collection methods
                print(f"Collection exists (no get method available)")

            # Try scroll with different parameters
            print("\n--- Testing scroll API ---")

            # Test 1: Basic scroll
            result1 = await client.points.scroll(
                collection,
                limit=10,
                with_payload=True,
                with_vectors=False
            )
            print(f"\nTest 1 - Basic scroll:")
            print(f"  Type: {type(result1)}")
            print(f"  Content: {result1}")

            # Test 2: Scroll with offset
            if hasattr(result1, '__iter__') and not isinstance(result1, str):
                try:
                    result2 = await client.points.scroll(
                        collection,
                        limit=10,
                        offset=0,
                        with_payload=True,
                        with_vectors=False
                    )
                    print(f"\nTest 2 - Scroll with offset:")
                    print(f"  Type: {type(result2)}")
                    print(f"  Content: {result2}")
                except Exception as e:
                    print(f"\nTest 2 - Error: {e}")

            # Test 3: Try count
            try:
                count = await client.points.count(collection)
                print(f"\nTest 3 - Count: {count}")
            except Exception as e:
                print(f"\nTest 3 - Count error: {e}")

            # Test 4: Try search instead
            import random
            random_vector = [random.random() for _ in range(768)]
            search_results = await client.points.search(
                collection,
                vector=random_vector,
                limit=5
            )
            print(f"\nTest 4 - Search results:")
            print(f"  Type: {type(search_results)}")
            print(f"  Count: {len(search_results) if hasattr(search_results, '__len__') else 'N/A'}")
            if search_results:
                first = search_results[0] if hasattr(search_results, '__getitem__') else search_results
                print(f"  First item type: {type(first)}")
                print(f"  First item: {first}")

    except Exception as e:
        import traceback
        print(f"Error: {e}")
        traceback.print_exc()
    finally:
        await client.__aexit__(None, None, None)

if __name__ == "__main__":
    asyncio.run(debug_scroll())
