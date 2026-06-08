"""Phase 11 prep readiness — migration window artifacts (not full rename)."""

from __future__ import annotations

import importlib
import warnings
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]


def test_phase11_prep_document_exists() -> None:
    path = ROOT / "docs" / "vnext" / "phase-11-prep.md"
    text = path.read_text(encoding="utf-8")
    assert "Host gates" in text
    assert "grid_view_spec" in text
    assert "not compatibility" in text
    assert "SHIM_ENABLED" in text or "_vnext_shim" in text


def test_compatibility_marker_is_registered() -> None:
    import tomllib

    data = tomllib.loads((ROOT / "pyproject.toml").read_text(encoding="utf-8"))
    markers = data["tool"]["pytest"]["ini_options"]["markers"]
    assert any("compatibility" in str(item) for item in markers)


def test_compatibility_test_modules_are_enumerated() -> None:
    from phase11_compat import COMPATIBILITY_TEST_MODULES

    assert "test_simple_table.py" in COMPATIBILITY_TEST_MODULES
    assert "test_grid_renderer.py" in COMPATIBILITY_TEST_MODULES
    assert len(COMPATIBILITY_TEST_MODULES) >= 10


def test_compatibility_marker_applied_to_legacy_module(request: pytest.FixtureRequest) -> None:
    from phase11_compat import COMPATIBILITY_TEST_MODULES

    session = request.session
    assert session is not None
    legacy_items = [item for item in session.items if item.path.name in COMPATIBILITY_TEST_MODULES]
    if not legacy_items:
        pytest.skip("run full test suite to verify compatibility markers on legacy modules")
    assert all(item.get_closest_marker("compatibility") for item in legacy_items)


def test_vnext_core_imports_without_django_grid_view_namespace() -> None:
    spec_mod = importlib.import_module("grid_view_spec")
    assert hasattr(spec_mod, "GridViewSpec")
    assert hasattr(spec_mod, "validate_spec")
    assert "django_grid_view" not in spec_mod.__dict__


def test_vnext_shim_module_is_disabled_until_phase11_rename() -> None:
    from django_grid_view._vnext_shim import (
        LEGACY_DIST_NAME,
        SHIM_ENABLED,
        VNEXT_DIST_NAME,
        VNEXT_IMPORT_ROOT,
        warn_legacy_public_import,
    )

    assert SHIM_ENABLED is False
    assert VNEXT_IMPORT_ROOT == "grid_view_spec"
    assert VNEXT_DIST_NAME == "grid-view-spec"
    assert LEGACY_DIST_NAME == "django-grid-view"
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        warn_legacy_public_import("GridArtifact", replacement="GridViewSpec blocks")
    assert caught == []


def test_django_grid_view_public_api_still_exports_legacy_symbols() -> None:
    import django_grid_view

    for symbol in ("GridArtifact", "SimpleTableConfig", "GridRenderer", "build_artifact_from_view"):
        assert hasattr(django_grid_view, symbol), f"missing legacy export {symbol!r}"


def test_vnext_test_modules_exist_outside_compatibility_set() -> None:
    from phase11_compat import COMPATIBILITY_TEST_MODULES

    vnext_modules = {
        "test_gridviewspec_render_html.py",
        "test_gridviewspec_mcp.py",
        "test_gridviewspec_export.py",
        "test_gridviewspec_django_views.py",
    }
    assert vnext_modules.isdisjoint(COMPATIBILITY_TEST_MODULES)
