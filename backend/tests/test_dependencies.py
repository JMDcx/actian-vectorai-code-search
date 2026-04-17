"""
Test dependencies for vector visualization feature
"""
import pytest
import numpy as np


def test_umap_import():
    """Test that umap-learn can be imported"""
    import umap
    assert umap.__version__ is not None
    print(f"✓ UMAP version: {umap.__version__}")


def test_scipy_import():
    """Test that scipy can be imported"""
    import scipy
    assert scipy.__version__ is not None
    print(f"✓ SciPy version: {scipy.__version__}")


def test_numpy_version_compatibility():
    """Test that numpy version is compatible (< 2.0)"""
    import numpy as np
    version_parts = np.__version__.split('.')
    major_version = int(version_parts[0])
    assert major_version < 2, "NumPy version must be < 2.0 for compatibility"
    print(f"✓ NumPy version: {np.__version__} (compatible)")


def test_umap_basic_functionality():
    """Test basic UMAP functionality with sample data"""
    import umap

    # Create sample data (simulating 768-dimensional CodeBERT vectors)
    test_data = np.random.rand(50, 768)  # 50 code snippets, 768 dimensions

    # Initialize UMAP reducer
    reducer = umap.UMAP(
        n_components=2,  # Reduce to 2D for visualization
        n_neighbors=15,
        min_dist=0.1,
        random_state=42
    )

    # Fit and transform
    embedding = reducer.fit_transform(test_data)

    # Verify output shape
    assert embedding.shape == (50, 2), f"Expected shape (50, 2), got {embedding.shape}"

    print(f"✓ UMAP reduction test passed: {test_data.shape} → {embedding.shape}")


def test_scipy_kdtree_import():
    """Test that scipy's KDTree can be imported (used for nearest neighbor search)"""
    from scipy.spatial import KDTree
    assert KDTree is not None
    print("✓ SciPy KDTree import successful")


if __name__ == "__main__":
    # Run tests manually
    test_umap_import()
    test_scipy_import()
    test_numpy_version_compatibility()
    test_umap_basic_functionality()
    test_scipy_kdtree_import()
    print("\n✅ All dependency tests passed!")