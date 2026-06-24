"""GridViewSpec semantic UI — callout, banner, tones, show_content."""

from __future__ import annotations

from grid_view_spec.hosts.memory import InMemoryHost
from grid_view_spec.mcp.fixtures import semantic_ui_spec
from grid_view_spec.render import render_grid_view_spec
from grid_view_spec.types.actions import GridViewActions, GridViewButtonAction, GridViewLinkAction
from grid_view_spec.types.content import GridViewContent, GridViewTab, GridViewTabs
from grid_view_spec.types.layout import GridViewArea, GridViewLayout
from grid_view_spec.types.semantic import normalize_semantic_tone
from grid_view_spec.types.spec import GridViewSpec
from grid_view_spec.types.table_v2 import GridViewTable
from grid_view_spec.validate import validate_spec


def test_normalize_semantic_tone_wire_aliases() -> None:
    assert normalize_semantic_tone("error") == "danger"
    assert normalize_semantic_tone("warn") == "warning"
    assert normalize_semantic_tone("info") == "info"
    assert normalize_semantic_tone("") == ""


def test_callout_renders_tone_and_title() -> None:
    spec = GridViewSpec(
        id="callout_demo",
        blocks=(
            GridViewContent(
                id="hint",
                role="callout",
                tone="success",
                title="OK",
                body="All good.",
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("hint",))),
    )
    html = render_grid_view_spec(spec, (), host=InMemoryHost(), backend="html")
    assert "cm-callout" in html
    assert "cm-tone-success" in html
    assert "cm-callout-title" in html
    assert "All good." in html


def test_banner_renders_full_width_strip() -> None:
    spec = GridViewSpec(
        id="banner_demo",
        blocks=(
            GridViewContent(
                id="notice",
                role="banner",
                tone="warning",
                body="Check settings.",
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("notice",))),
    )
    html = render_grid_view_spec(spec, (), host=InMemoryHost(), backend="html")
    assert "cm-banner" in html
    assert "cm-tone-warning" in html


def test_content_initial_hidden_adds_block_hidden_class() -> None:
    spec = GridViewSpec(
        id="hidden_demo",
        blocks=(
            GridViewContent(
                id="save_hint",
                role="callout",
                tone="info",
                body="Unsaved.",
                extra={"initial_hidden": True},
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("save_hint",))),
    )
    html = render_grid_view_spec(spec, (), host=InMemoryHost(), backend="html")
    assert 'id="block-save_hint"' in html
    assert "cm-block-content hidden" in html


def test_tabs_semantic_badge_tone_and_admin_link() -> None:
    spec = GridViewSpec(
        id="tabs_semantic",
        blocks=(
            GridViewActions(
                id="admin_actions",
                items=(
                    GridViewLinkAction(
                        id="admin",
                        label="Edit",
                        href="/admin/",
                        variant="ghost",
                        tone="warning",
                        icon="edit",
                    ),
                ),
            ),
            GridViewTabs(
                id="tabs",
                presentation="pills",
                extra={"nav_variant": "paired", "wrap_align": "center", "actions": "admin_actions"},
                tabs=(
                    GridViewTab(
                        id="a",
                        label="Tab A",
                        area="a_area",
                        active=True,
                        badge="3",
                        badge_tone="danger",
                    ),
                ),
            ),
        ),
        layout=GridViewLayout(
            root=GridViewArea(id="root", blocks=("tabs",), areas=(GridViewArea(id="a_area"),)),
        ),
    )
    html = render_grid_view_spec(spec, (), host=InMemoryHost(), backend="html")
    assert "cm-tabs-nav-paired" in html
    assert "cm-export-btn cm-tab-btn" in html
    assert "cm-export-group--paired" in html
    assert "cm-tone-danger" in html
    assert "cm-btn-ghost" in html
    assert "cm-tone-warning" in html
    assert "cm-btn-icon" in html


def test_show_content_button_marks_data_attributes() -> None:
    spec = GridViewSpec(
        id="show_content_demo",
        blocks=(
            GridViewContent(
                id="hint",
                role="callout",
                body="Shown.",
                extra={"initial_hidden": True},
            ),
            GridViewActions(
                id="actions",
                items=(
                    GridViewButtonAction(
                        id="reveal",
                        label="Show",
                        action="show_content",
                        target="hint",
                        params={"auto_hide_ms": 4000},
                    ),
                ),
            ),
        ),
        layout=GridViewLayout(
            root=GridViewArea(
                id="root",
                blocks=(
                    "actions",
                    "hint",
                ),
            )
        ),
    )
    html = render_grid_view_spec(spec, (), host=InMemoryHost(), backend="html")
    assert 'data-cm-action="show_content"' in html
    assert 'data-cm-action-target="hint"' in html
    assert 'data-cm-auto-hide-ms="4000"' in html


def test_toolbar_soft_link_renders_outside_export_group() -> None:
    from grid_view_spec.types.actions import GridViewLinkAction
    from grid_view_spec.types.toolbar import GridViewToolbar

    spec = GridViewSpec(
        id="toolbar_soft_link",
        blocks=(
            GridViewActions(
                id="actions",
                items=(
                    GridViewLinkAction(
                        id="history",
                        label="Past errors",
                        href="?history=1",
                        variant="soft",
                    ),
                ),
            ),
            GridViewToolbar(id="toolbar", target="table", actions="actions"),
            GridViewTable(
                id="table",
                backend="simple",
                columns=(),
            ),
        ),
        layout=GridViewLayout(
            root=GridViewArea(id="root", blocks=("toolbar", "table")),
        ),
    )
    html = render_grid_view_spec(spec, (), host=InMemoryHost(), backend="html")
    assert "cm-btn-soft" in html
    assert "Past errors" in html
    assert "cm-export-group--paired" not in html


def test_semantic_ui_fixture_validates() -> None:
    assert validate_spec(semantic_ui_spec()).ok
