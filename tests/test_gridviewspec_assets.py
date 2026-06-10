"""Tests for GridViewSpec asset manifest and static bundle alignment."""

from __future__ import annotations

import json
from pathlib import Path
from typing import TypedDict

from grid_view_spec.hosts.memory import InMemoryHost
from grid_view_spec.render import build_render_context
from grid_view_spec.types.wire import is_object_list, is_wire_mapping
from tests.gridviewspec_fixtures import rich_spec

REPO_ROOT = Path(__file__).resolve().parent.parent
STATIC_DIR = REPO_ROOT / "src/grid_view_spec/static/grid_view_spec"
MANIFEST_PATH = REPO_ROOT / "frontend/asset-manifest.json"


class _ManifestEntry(TypedDict):
    id: str


class _AssetManifest(TypedDict):
    bundles: list[_ManifestEntry]
    stylesheets: list[_ManifestEntry]


def _static_js_files() -> frozenset[str]:
    return frozenset(path.name for path in STATIC_DIR.glob("*.js"))


def _static_css_files() -> frozenset[str]:
    return frozenset(path.name for path in STATIC_DIR.glob("*.css"))


def _require_entry_id(raw: object, *, label: str) -> _ManifestEntry:
    if not is_wire_mapping(raw):
        msg = f"{label} must be an object with string id"
        raise TypeError(msg)
    entry_id = raw.get("id")
    if not isinstance(entry_id, str):
        msg = f"{label} must include string id"
        raise TypeError(msg)
    return {"id": entry_id}


def _load_manifest() -> _AssetManifest:
    raw = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    if not is_wire_mapping(raw):
        msg = "asset-manifest.json must be a JSON object"
        raise TypeError(msg)
    bundles_raw = raw.get("bundles")
    stylesheets_raw = raw.get("stylesheets")
    if not is_object_list(bundles_raw) or not is_object_list(stylesheets_raw):
        msg = "asset-manifest.json must contain bundles and stylesheets arrays"
        raise TypeError(msg)
    bundles = [_require_entry_id(item, label="manifest bundle") for item in bundles_raw]
    stylesheets = [_require_entry_id(item, label="manifest stylesheet") for item in stylesheets_raw]
    return {"bundles": bundles, "stylesheets": stylesheets}


def test_rich_spec_manifest_bundles_reference_existing_static_files() -> None:
    spec = rich_spec()
    ctx = build_render_context(spec, (), host=InMemoryHost())
    static_js = _static_js_files()

    assert ctx.assets.manifest_bundles
    assert "gridviewspec" in ctx.assets.manifest_bundles

    for bundle_id in ctx.assets.manifest_bundles:
        min_file = f"{bundle_id}.min.js"
        assert min_file in static_js, f"missing static file for bundle {bundle_id!r}: {min_file}"


def test_asset_manifest_entries_match_static_directory() -> None:
    manifest = _load_manifest()
    static_js = _static_js_files()
    for entry in manifest["bundles"]:
        bundle_id = entry["id"]
        for suffix in (".js", ".min.js"):
            filename = f"{bundle_id}{suffix}"
            assert filename in static_js, f"manifest bundle {bundle_id!r} missing {filename}"

    static_css = _static_css_files()
    for entry in manifest["stylesheets"]:
        sheet_id = entry["id"]
        for suffix in (".css", ".min.css"):
            filename = f"{sheet_id}{suffix}"
            assert filename in static_css, f"manifest stylesheet {sheet_id!r} missing {filename}"


def test_static_directory_has_no_orphan_js_files() -> None:
    manifest = _load_manifest()
    manifest_ids = {entry["id"] for entry in manifest["bundles"]}
    allowed = set()
    for bundle_id in manifest_ids:
        allowed.add(f"{bundle_id}.js")
        allowed.add(f"{bundle_id}.min.js")

    orphans = sorted(_static_js_files() - allowed)
    assert not orphans, f"orphan static JS files (not in manifest): {orphans}"


def test_block_registry_bundle_ids_exist_in_manifest() -> None:
    from grid_view_spec.render.block_registry import BLOCK_TYPES, asset_bundles_for_types

    manifest = _load_manifest()
    manifest_ids = {entry["id"] for entry in manifest["bundles"]}
    registry_bundles = asset_bundles_for_types(BLOCK_TYPES)
    missing = sorted(bundle for bundle in registry_bundles if bundle not in manifest_ids)
    assert not missing, f"block registry references bundles missing from manifest: {missing}"
    removed = ("chart-static-boot", "kpi-static-boot", "grid-artifact-boot", "column-settings")
    assert not any(bundle in removed for bundle in registry_bundles)
