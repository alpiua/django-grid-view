"""Guard tests: vNext ``grid_view_spec`` must not collide with legacy exports."""

from __future__ import annotations

from pathlib import Path

import django_grid_view
import grid_view_spec
from django_grid_view.compat import LegacyGridViewSpec
from django_grid_view.types import GridViewSpec as DjangoGridViewSpec
from grid_view_spec.types.spec import GridViewSpec as VNextGridViewSpec

ROOT = Path(__file__).resolve().parents[1]
PRIMARY_DOCS = (
    ROOT / "docs" / "getting-started.md",
    ROOT / "docs" / "grid-view-artifacts.md",
    ROOT / "docs" / "llm" / "django-grid-view-llm-context.md",
)
LEGACY_MARKERS = ("legacy-primary", "## Legacy", "### Legacy", "**Legacy API.**")
LEGACY_PATTERNS = (
    "build_artifact_from_view",
    "GridRenderer.build",
    "{% render_grid_view %}",
    "GridArtifact",
)


def _line_has_legacy_marker(line: str) -> bool:
    """Return ``True`` when a doc line contains a recognized legacy section marker."""
    return any(marker in line for marker in LEGACY_MARKERS)


def test_vnext_and_legacy_gridviewspec_are_distinct_types() -> None:
    """vNext and legacy GridViewSpec classes must remain separate types."""
    assert VNextGridViewSpec is not DjangoGridViewSpec
    assert VNextGridViewSpec is not LegacyGridViewSpec


def test_grid_view_spec_exports_vnext_spec() -> None:
    """``grid_view_spec`` package must export the vNext spec type."""
    assert grid_view_spec.GridViewSpec is VNextGridViewSpec


def test_django_grid_view_does_not_export_vnext_spec() -> None:
    """``django_grid_view`` must keep exporting the legacy spec type only."""
    assert django_grid_view.GridViewSpec is DjangoGridViewSpec
    assert django_grid_view.GridViewSpec is not VNextGridViewSpec


def test_primary_docs_mark_legacy_apis() -> None:
    """Docs that mention 1.x APIs must include an explicit legacy marker section."""
    violations: list[str] = []
    for doc_path in PRIMARY_DOCS:
        if not doc_path.exists():
            continue
        text = doc_path.read_text(encoding="utf-8")
        if not any(pattern in text for pattern in LEGACY_PATTERNS):
            continue
        if not any(_line_has_legacy_marker(line) for line in text.splitlines()):
            violations.append(f"{doc_path.relative_to(ROOT)}: missing legacy marker for 1.x APIs")
    assert not violations, "\n".join(violations)
