# Block catalog

All visible nodes live in `spec.blocks`. Layout places them by id.

## Chrome and navigation

| Block | Doc |
|-------|-----|
| `GridViewHeader`, `GridViewNav`, `GridViewEntity` | [Header and navigation](header-nav.md) |
| `GridViewToolbar`, `GridViewFilters`, `GridViewActions` | [Toolbar, filters, actions](toolbar-filters-actions.md) |

## Data presentation

| Block | Doc |
|-------|-----|
| `GridViewTable` | [Tables](../tables/index.md) |
| `GridViewKpi`, `GridViewCharts` | [KPI and charts](../visualization/kpi-charts.md) |
| `GridViewCards`, `GridViewGallery`, `GridViewImage` | [Cards and gallery](../visualization/cards-gallery.md) |

## Interaction

| Block | Doc |
|-------|-----|
| `GridViewForm` | [Forms](forms.md) |
| `GridViewOverlay`, `GridViewTabs` | [Overlays and tabs](overlays-tabs.md) |
| `GridViewTemplate`, `GridViewContent` | [Template and content](template-content.md) |

## Shared block base

Every block inherits:

```python
class GridViewBlockBase:
    id: str
    type: str
    title: str = ""
    extra: Mapping[str, JsonValue] = field(default_factory=dict)
    style: GridViewStyle = field(default_factory=GridViewStyle)
    lazy: GridViewLazyBlock | None = None
```

Rare options use documented keys in `extra` (+ `strict_unknown_config` when enabled).

## Registries

Hosts extend behavior through **named ids** in the spec:

| Registry | Spec field |
|----------|------------|
| Cell renderers | `GridViewColumn.renderer` |
| Cell editors | `GridViewColumn.extra.editor` |
| Form validators | `GridViewValidator.kind="custom"` |
| Commit hooks | `GridViewTableEdit.commit_callback` |

Built-in renderers: `badge`, `tag`, `link`, `money`, `progress`, `date`, `boolean`, `image`, `thumbnail`.
