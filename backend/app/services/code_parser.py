import ast
import os
import re
import uuid
from typing import List, Dict, Any, Optional
from pathlib import Path
from app.models.schemas import CodeSnippet, CodeType, Language, CodeSnippetMetadata
import hashlib
from datetime import datetime


class CodeParser:
    """Parse code files and extract structured snippets."""

    def __init__(self):
        self.supported_extensions = {
            '.py': Language.PYTHON,
            '.js': Language.JAVASCRIPT,
            '.ts': Language.TYPESCRIPT,
            '.tsx': Language.TYPESCRIPT,
        }

    def is_supported_file(self, file_path: str) -> bool:
        """Check if file is supported for parsing."""
        ext = Path(file_path).suffix.lower()
        return ext in self.supported_extensions

    def parse_file(self, file_path: str) -> List[CodeSnippet]:
        """Parse a single file and extract code snippets."""
        language = self.supported_extensions[Path(file_path).suffix.lower()]

        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        if language == Language.PYTHON:
            return self._parse_python(file_path, content)
        elif language in (Language.JAVASCRIPT, Language.TYPESCRIPT):
            return self._parse_javascript(file_path, content, language)

        return []

    def _parse_python(self, file_path: str, content: str) -> List[CodeSnippet]:
        """Parse Python file and extract functions, classes, and imports."""
        snippets = []

        try:
            tree = ast.parse(content)
        except SyntaxError:
            return snippets

        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                snippet = self._extract_python_function(file_path, content, node)
                if snippet:
                    snippets.append(snippet)
            elif isinstance(node, ast.ClassDef):
                snippet = self._extract_python_class(file_path, content, node)
                if snippet:
                    snippets.append(snippet)

        # Extract imports
        import_snippets = self._extract_python_imports(file_path, content, tree)
        snippets.extend(import_snippets)

        return snippets

    def _extract_python_function(
        self,
        file_path: str,
        content: str,
        node: ast.FunctionDef
    ) -> Optional[CodeSnippet]:
        """Extract a Python function as a code snippet."""
        lines = content.split('\n')

        # Get function code
        start_line = node.lineno - 1
        end_line = node.end_lineno if hasattr(node, 'end_lineno') else start_line + 1
        code = '\n'.join(lines[start_line:end_line])

        # Extract metadata
        metadata = CodeSnippetMetadata(
            function_name=node.name,
            parameters=[arg.arg for arg in node.args.args],
            returns=self._get_return_annotation(node),
            decorators=self._get_decorators(node)
        )

        return CodeSnippet(
            id=self._generate_id(file_path, node.name, start_line),
            file_path=file_path,
            language=Language.PYTHON,
            code_type=CodeType.FUNCTION,
            code=code,
            start_line=start_line + 1,
            end_line=end_line + 1,
            metadata=metadata
        )

    def _extract_python_class(
        self,
        file_path: str,
        content: str,
        node: ast.ClassDef
    ) -> Optional[CodeSnippet]:
        """Extract a Python class as a code snippet."""
        lines = content.split('\n')

        start_line = node.lineno - 1
        end_line = node.end_lineno if hasattr(node, 'end_lineno') else start_line + 1
        code = '\n'.join(lines[start_line:end_line])

        metadata = CodeSnippetMetadata(
            class_name=node.name,
            dependencies=[base.id for base in node.bases if isinstance(base, ast.Name)]
        )

        return CodeSnippet(
            id=self._generate_id(file_path, node.name, start_line),
            file_path=file_path,
            language=Language.PYTHON,
            code_type=CodeType.CLASS,
            code=code,
            start_line=start_line + 1,
            end_line=end_line + 1,
            metadata=metadata
        )

    def _extract_python_imports(
        self,
        file_path: str,
        content: str,
        tree: ast.AST
    ) -> List[CodeSnippet]:
        """Extract import statements from Python file."""
        snippets = []
        lines = content.split('\n')

        for node in ast.walk(tree):
            if isinstance(node, (ast.Import, ast.ImportFrom)):
                start_line = node.lineno - 1
                code = lines[start_line].strip()

                if code:
                    snippet = CodeSnippet(
                        id=self._generate_id(file_path, f"import_{start_line}", start_line),
                        file_path=file_path,
                        language=Language.PYTHON,
                        code_type=CodeType.IMPORT,
                        code=code,
                        start_line=start_line + 1,
                        end_line=start_line + 1,
                        metadata=CodeSnippetMetadata()
                    )
                    snippets.append(snippet)

        return snippets

    def _parse_javascript(
        self,
        file_path: str,
        content: str,
        language: Language
    ) -> List[CodeSnippet]:
        """Parse JavaScript/TypeScript file using regex patterns."""
        snippets = []
        lines = content.split('\n')

        # Extract functions
        func_pattern = r'(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)\s*=>|(?:function\s*)?\w+))'

        for i, line in enumerate(lines):
            match = re.search(func_pattern, line)
            if match:
                func_name = match.group(1) or match.group(2)
                code = line.strip()

                snippet = CodeSnippet(
                    id=self._generate_id(file_path, func_name, i),
                    file_path=file_path,
                    language=language,
                    code_type=CodeType.FUNCTION,
                    code=code,
                    start_line=i + 1,
                    end_line=i + 1,
                    metadata=CodeSnippetMetadata(function_name=func_name)
                )
                snippets.append(snippet)

        # Extract classes
        class_pattern = r'class\s+(\w+)'
        for i, line in enumerate(lines):
            match = re.search(class_pattern, line)
            if match:
                class_name = match.group(1)
                code = line.strip()

                snippet = CodeSnippet(
                    id=self._generate_id(file_path, class_name, i),
                    file_path=file_path,
                    language=language,
                    code_type=CodeType.CLASS,
                    code=code,
                    start_line=i + 1,
                    end_line=i + 1,
                    metadata=CodeSnippetMetadata(class_name=class_name)
                )
                snippets.append(snippet)

        return snippets

    def _get_return_annotation(self, node: ast.FunctionDef) -> Optional[str]:
        """Extract return type annotation from function."""
        if node.returns:
            return ast.unparse(node.returns)
        return None

    def _get_decorators(self, node: ast.FunctionDef) -> List[str]:
        """Extract decorator names from function."""
        decorators = []
        for decorator in node.decorator_list:
            if isinstance(decorator, ast.Name):
                decorators.append(decorator.id)
            elif isinstance(decorator, ast.Attribute):
                decorators.append(ast.unparse(decorator))
        return decorators

    def _generate_id(self, file_path: str, name: str, line: int) -> str:
        """Generate unique ID for code snippet using UUID5 (deterministic)."""
        content = f"{file_path}:{name}:{line}"
        # Use UUID5 with a namespace for deterministic UUID generation
        # This ensures the same file:name:line always generates the same UUID
        namespace = uuid.NAMESPACE_DNS  # Using DNS namespace as base
        return str(uuid.uuid5(namespace, content))


# Global instance
code_parser = CodeParser()
