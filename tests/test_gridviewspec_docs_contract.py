"""Contract tests: primary docs describe the current GridViewSpec surface."""

from __future__ import annotations

from importlib.metadata import version
from pathlib import Path

import grid_view_spec

ROOT = Path(__file__).resolve().parents[1]
REMOVED_STATIC_BOOTS = (
    "column-settings.min.js",
    "chart-static-boot.js",
    "grid-artifact-boot.js",
    "kpi-static-boot.js",
)


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


def test_primary_docs_do_not_recommend_removed_boot_scripts() -> None:
    """Removed per-page boot scripts must not appear in primary reference docs."""
    primary_docs = (
        ROOT / "docs" / "reference" / "javascript.md",
        ROOT / "docs" / "concepts" / "overview.md",
        ROOT / "docs" / "reference" / "template-tags.md",
        ROOT / "docs" / "getting-started.md",
        ROOT / "docs" / "integration" / "django.md",
        ROOT / "docs" / "export" / "page-pattern.md",
    )
    violations: list[str] = []
    for doc_path in primary_docs:
        text = doc_path.read_text(encoding="utf-8")
        for boot_script in REMOVED_STATIC_BOOTS:
            if boot_script in text:
                violations.append(
                    f"{doc_path.relative_to(ROOT)}: mentions removed boot script {boot_script}"
                )
    assert not violations, "\n".join(violations)
