# Layout

`GridViewLayout` is an area tree. Areas hold **block id lists**, not block objects.

```python
@dataclass(frozen=True, slots=True)
class GridViewLayout:
    root: GridViewArea = field(default_factory=lambda: GridViewArea(id="root"))

@dataclass(frozen=True, slots=True)
class GridViewArea:
    id: str
    type: Literal["stack", "grid", "sidebar", "split", "tabs", "modal", "table-card"] = "stack"
    blocks: tuple[str, ...] = ()
    areas: tuple[GridViewArea, ...] = ()
```

## Area types

| `type` | Use |
|--------|-----|
| `stack` | Vertical stack (default page body) |
| `grid` | CSS grid; column count in `extra` |
| `sidebar` | Main + aside |
| `split` | Resizable panes |
| `tabs` | Tab panels referencing nested areas |
| `table-card` | Fused toolbar + table in one card chrome |
| `modal` | Overlay shell placement |

## Table-card pattern

Two valid layouts (toolbar is always a **layout block**, never embedded in `GridViewTable`):

### Outside toolbar (recommended for page chrome)

```text
root stack
├── toolbar block   (target = table_id; filters/actions via block refs)
└── table-card area
    └── table block
```

`GridViewFilters` and `GridViewActions` are **not** separate layout blocks when the toolbar
references them — the toolbar template renders filter UI and action buttons inline.

### In-card toolbar (compact card)

```text
table-card area
├── toolbar block   (target = table_id)
└── table block
```

Page-wide chrome: place `GridViewToolbar` at layout root with `target=None`.

## Toolbar binding

`GridViewToolbar.target`:

- `None` — page-wide toolbar (filters, shared search)
- `"<table_id>"` — toolbar bound to one table (export sync, search scope)

Co-locating toolbar and table in one area does **not** auto-bind — `target` is always explicit.

## Nested overlays

`GridViewOverlay` may embed a nested `GridViewSpec`. Block ids must remain unique across the full tree.
