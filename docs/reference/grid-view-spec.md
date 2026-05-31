# GridViewSpec

Declarative JSON contract for Grid View 1.0. **Rows are never embedded in the spec** — pass them separately to `GridRenderer.build` or `build_artifact_from_view`.

Canonical schema file in the repository:

```
schema/grid-view-spec.v1.json
```

## Required fields

| Field | Type | Description |
|-------|------|-------------|
| `grid_id` | string | DOM id prefix (`^[a-z][a-z0-9_-]*$`) |
| `columns` | array | At least one column spec |

## Top-level optional fields

| Field | Description |
|-------|-------------|
| `title` | Heading above the view |
| `kpis` | Up to 8 KPI specs (structure only) |
| `charts` | Up to 3 chart specs |
| `layout` | Block order: `title`, `kpis`, `chart`, `table`, … |
| `wrapper` | `full`, `inner`, or `shell` |
| `search_mode` | `global`, `per_column`, `disabled` |
| `striped` | Table zebra striping |
| `export_xlsx` | Enable client XLSX export |
| `export_pdf_url` | Server PDF download URL |

## Column spec

| Field | Default | Notes |
|-------|---------|-------|
| `key`, `label` | required | Row dict key and header |
| `format` | `text` | `text`, `number`, `currency`, `percent` |
| `align` | `left` | `left`, `center`, `right` |
| `sortable`, `searchable` | `true` | |
| `link_template` | — | URL with `{placeholders}` |
| `width` | — | CSS width |

## KPI spec

| Field | Notes |
|-------|-------|
| `label` | required |
| `column_key` | Column to aggregate (optional for `count`) |
| `aggregate` | `count`, `sum`, `avg`, `min`, `max`, … |
| `format` | Display format enum |
| `icon`, `tone` | Optional card styling |

## Chart spec

| Field | Notes |
|-------|-------|
| `id` | Unique within view |
| `chart_type` | `bar`, `line`, `pie`, … |
| `x_key` | Category axis field |
| `series` | `[{ "key", "label" }]` |
| `data_source` | `static` or `grid_filtered` |
| `height` | Pixel height |

## Python usage

```python
from django_grid_view.types import GridViewSpecWire, JsonObject, RowDict
from django_grid_view.render import GridRenderer, parse_grid_view_spec, parse_grid_view_spec_json

rows: list[RowDict] = [...]

# JSON from LLM / API
raw: JsonObject = {"grid_id": "demo", "columns": [{"key": "name", "label": "Name"}]}
spec = parse_grid_view_spec_json(raw)

# Typed wire literal
wire: GridViewSpecWire = {"grid_id": "demo", "columns": [{"key": "name", "label": "Name"}]}
spec = parse_grid_view_spec(wire)

artifact = GridRenderer.build(spec, rows)
```

See [Python types](python-types.md) for all public imports.

## LLM / chat output

Allowed: `view` object matching this schema.  
Forbidden: `rows`, numeric KPI values, raw `echarts_option`, SQL text.

See [Chat visualizer](../guides/chat-visualizer.md).
