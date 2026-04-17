import pytest
import tempfile
import os
from pathlib import Path

from app.services.code_parser import code_parser
from app.models.schemas import CodeType, Language


@pytest.fixture
def temp_python_file():
    """Create a temporary Python file for testing."""
    content = '''
def add_numbers(a: int, b: int) -> int:
    """Add two numbers together."""
    return a + b

class Calculator:
    """A simple calculator class."""

    def multiply(self, x, y):
        return x * y

import os
import sys
'''
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(content)
        temp_path = f.name

    yield temp_path

    # Cleanup
    os.unlink(temp_path)


def test_parse_python_file(temp_python_file):
    """Test parsing a Python file."""
    snippets = code_parser.parse_file(temp_python_file)

    assert len(snippets) > 0

    # Check for function snippet
    func_snippets = [s for s in snippets if s.code_type == CodeType.FUNCTION]
    assert len(func_snippets) > 0
    assert func_snippets[0].metadata.function_name == "add_numbers"

    # Check for class snippet
    class_snippets = [s for s in snippets if s.code_type == CodeType.CLASS]
    assert len(class_snippets) > 0
    assert class_snippets[0].metadata.class_name == "Calculator"


def test_is_supported_file():
    """Test file extension checking."""
    assert code_parser.is_supported_file("test.py") is True
    assert code_parser.is_supported_file("test.js") is True
    assert code_parser.is_supported_file("test.ts") is True
    assert code_parser.is_supported_file("test.txt") is False
    assert code_parser.is_supported_file("test.java") is False
