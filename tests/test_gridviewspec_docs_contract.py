"""Contract tests: primary docs must mark legacy 1.x APIs when referenced."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

PRIMARY_DOCS = (
    ROOT / "docs" / "getting-started.md",
    ROOT / "docs" / "grid-view-artifacts.md",
    ROOT / "docs" / "llm" / "django-grid-view-llm-context.md",
)
VNEXT_REFERENCE_DOCS = (
    ROOT / "docs" / "reference" / "javascript.md",
    ROOT / "docs" / "architecture.md",
    ROOT / "docs" / "reference" / "template-tags.md",
)
REMOVED_STATIC_BOOTS = (
    "column-settings.min.js",
    "chart-static-boot.js",
    "grid-artifact-boot.js",
    "kpi-static-boot.js",
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


def test_vnext_deprecation_inventory_exists() -> None:
    """Deprecation inventory must list vNext migration targets."""
    path = ROOT / "docs" / "vnext" / "deprecation-targets.md"
    assert path.exists()
    text = path.read_text(encoding="utf-8")
    assert "LegacyGridViewSpec" in text or "render_grid_view" in text


def test_architecture_doc_points_mcp_to_grid_view_spec() -> None:
    text = (ROOT / "docs" / "gridviewspec-architecture.md").read_text(encoding="utf-8")
    assert "src/grid_view_spec/mcp/" in text
    assert "src/django_grid_view/mcp/" not in text
    assert "gridview_a2ui_catalog" in text
    assert "gridview_apply_patch" in text


def test_mcp_doc_points_to_grid_view_spec_package() -> None:
    text = (ROOT / "docs" / "grid-view-spec.mcp").read_text(encoding="utf-8")
    assert "src/grid_view_spec/mcp/" in text
    assert "grid_view_spec.mcp.server:main" in text
    assert "gridviewspec-mcp" in text
    assert "src/django_grid_view/mcp/" not in text


def test_phase11_prep_document_exists() -> None:
    path = ROOT / "docs" / "vnext" / "phase-11-prep.md"
    assert path.is_file()
    text = path.read_text(encoding="utf-8")
    assert "COMPATIBILITY" in text or "compatibility" in text
    assert "grid_view_spec" in text


def test_primary_docs_mark_legacy_apis_or_use_transitional_section() -> None:
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


def _text_before_legacy_sections(text: str) -> str:
    """Return doc body before the first explicit legacy section marker."""
    for marker in LEGACY_MARKERS:
        if marker in text:
            return text.split(marker, 1)[0]
    return text


def test_vnext_reference_docs_document_unified_boot() -> None:
    """Primary JS/architecture docs must describe unified grid-view.min.js boot."""
    javascript = (ROOT / "docs" / "reference" / "javascript.md").read_text(encoding="utf-8")
    architecture = (ROOT / "docs" / "architecture.md").read_text(encoding="utf-8")
    template_tags = (ROOT / "docs" / "reference" / "template-tags.md").read_text(encoding="utf-8")

    assert "GridView.bootScope" in javascript
    assert "grid-view.min.js" in javascript
    assert "GridView.bootScope" in architecture or "bootScope" in architecture
    assert "grid-view.min.js" in architecture
    assert "grid-view.min.js" in template_tags


def test_vnext_reference_docs_do_not_recommend_removed_boot_scripts() -> None:
    """Removed per-page boot scripts must not appear before legacy sections."""
    violations: list[str] = []
    for doc_path in VNEXT_REFERENCE_DOCS:
        text = _text_before_legacy_sections(doc_path.read_text(encoding="utf-8"))
        for boot_script in REMOVED_STATIC_BOOTS:
            if boot_script in text:
                violations.append(
                    f"{doc_path.relative_to(ROOT)}: primary section mentions {boot_script}"
                )
    assert not violations, "\n".join(violations)
