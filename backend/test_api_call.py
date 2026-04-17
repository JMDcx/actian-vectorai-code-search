import asyncio
import sys
sys.path.insert(0, '.')

async def test():
    from app.api.visualization import get_graph_data

    print("Testing API endpoint directly...")
    try:
        result = await get_graph_data(limit=50)
        print(f"Result: {result}")
        print(f"Nodes count: {len(result.get('nodes', []))}")
        print(f"Edges count: {len(result.get('edges', []))}")
        if result.get('nodes'):
            print(f"First node: {result['nodes'][0]}")
    except Exception as e:
        import traceback
        print(f"Error: {e}")
        traceback.print_exc()

asyncio.run(test())
