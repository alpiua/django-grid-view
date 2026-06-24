"""Contract tests: primary docs describe the current GridViewSpec surface."""

from __future__ import annotations

from importlib.metadata import version
from pathlib import Path

import grid_view_spec

ROOT = Path(__file__).resolve().parents[1]


def test_package_version_matches_distribution_metadata() -> None:
    assert grid_view_spec.__version__ == version("grid-view-spec")


def test_architecture_doc_points_mcp_to_grid_view_spec() -> None:
    text = (ROOT / "docs" / "maintainers" / "gridviewspec-architecture.md").read_text(
        encoding="utf-8"
    )
    assert "mcp/" in text
    assert "to_a2ui_catalog" in text
    assert "gridview_apply_patch" in text


def test_mcp_doc_points_to_grid_view_spec_package() -> None:
    text = (ROOT / "docs" / "grid-view-spec.mcp").read_text(encoding="utf-8")
    assert "src/grid_view_spec/mcp/" in text
    assert "grid_view_spec.mcp.server:main" in text
    assert "gridviewspec-mcp" in text


def test_primary_docs_document_unified_boot() -> None:
    """Primary JS/architecture docs must describe unified gridviewspec.min.js boot."""
    javascript = (ROOT / "docs" / "reference" / "javascript.md").read_text(encoding="utf-8")
    architecture = (ROOT / "docs" / "concepts" / "overview.md").read_text(encoding="utf-8")
    template_tags = (ROOT / "docs" / "reference" / "template-tags.md").read_text(encoding="utf-8")

    assert "GridView.bootScope" in javascript
    assert "gridviewspec.min.js" in javascript
    assert "GridView.bootScope" in architecture or "bootScope" in architecture
    assert "gridviewspec.min.js" in architecture
    assert "gridviewspec.min.js" in template_tags
