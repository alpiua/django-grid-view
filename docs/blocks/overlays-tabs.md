# Overlays and tabs

## GridViewOverlay

Modal, drawer, or popover hosting nested content:

```python
GridViewOverlay(
    id="edit_overlay",
    presentation="modal",  # modal | drawer | popover
    spec=nested_grid_view_spec,  # or content="template_block_id"
    trigger=GridViewButtonAction(action="open_overlay", overlay="edit_overlay"),
)
```

Nested `spec` must use globally unique block ids across the parent tree.

## GridViewTabs

Tab areas reference nested layout areas by id (or a single block via `tab.block`). Each tab
panel can hold its own block subtree.

### Layout pattern (alarms-style)

```text
blocks:
  page_tabs   GridViewTabs(presentation="pills", extra={"url_param": "tab"}, tabs=[…])
  …toolbar / filters / table blocks per tab…

layout:
  root.blocks = [page_tabs]
  errors_area (table-card) → [toolbar, filters, table]
  emz_area    (table-card) → …
  finances_area (stack)    → [GridViewTemplate]
```

Host sets `GridViewTab.active=True` from `?tab=` (deep link). Package runtime toggles panes on
click and optionally syncs `history.replaceState` when `extra.url_param` is set.

### DOM contract (Jinja + Django render)

| Element | Attributes |
|---------|------------|
| Tab nav | `data-cm-tab-group`, optional `data-cm-tab-url-param` |
| Tab button | `data-cm-tab-target` → area/block id, `data-cm-tab-id` → slug for URL |
| Tab pane (area or block) | `data-cm-tab-pane="{id}"`, `hidden` when inactive |

Boot: `initTabGroups` (via unified `bootScope`) shows/hides `[data-cm-tab-pane]` and re-boots
widgets in the revealed pane.

MCP fixture: `gridview_examples(case="tabs_area_refs")`.

### Semantic tabs (preferred)

```python
GridViewTabs(
    id="page_tabs",
    presentation="pills",
    extra={"url_param": "tab", "nav_variant": "paired", "wrap_align": "center"},
    tabs=(
        GridViewTab(id="errors", label="Errors", area="errors_area", badge="3", badge_tone="danger"),
    ),
)
```

Tab buttons render as `cm-btn-segment`; badges use `cm-tone-{badge_tone}`. Admin links in
`extra.actions`: `GridViewLinkAction(variant="ghost", tone="warning", icon="edit")`.

`extra.nav_class`, `extra.badge_tones`, and `column.extra.pill_class` are host-styling escape
hatches that map to `GridViewSemanticTone` tokens. Prefer the portable semantic fields
`nav_variant`, `GridViewTab.badge_tone`, and `column.extra.tone` unless you need host-specific CSS.

MCP fixture: `gridview_examples(case="semantic_ui")`.

Lazy loading: mark individual blocks with `lazy=GridViewLazyBlock(...)` for HTMX fragment load.

See [Integration — HTMX](../integration/htmx-assets.md).
