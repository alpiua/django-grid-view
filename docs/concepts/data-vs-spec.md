# Data vs spec

`GridViewSpec` is **structure only**. Row data never lives inside the spec.

## Rules

| In spec | Outside spec |
|---------|--------------|
| Block ids, column ids, labels | Row dicts / ORM rows |
| Filter schema and current state | Queryset filtering in Python |
| Chart axes and series keys | Numeric series values |
| `GridViewTable.datasource.endpoint` URL | API response bodies |
| Renderer ids (`badge`, `money`, …) | Renderer implementation (host JS registry) |

```python
# Correct: rows passed at render time
html = render_grid_view_spec(spec, rows, host=host)

# Wrong: embedding row data in blocks (except inline demos)
GridViewTable(rows=({"id": 1},))  # only for small static fixtures
```

## Page loader pattern

```text
request → page_data loader → rows + GridViewSpec → view → template
```

One loader should feed HTML render and export builders. See [Page export pattern](../export/page-pattern.md).

## Dynamic columns

`GridViewTable.column_source` fetches **column definitions** at runtime (e.g. dealer price tiers), not row payloads. Rows still come from the host row API or server render path.

## Validation boundary

`validate_spec(spec)` checks structure, id uniqueness, toolbar XOR search, and policy gates. It does **not** validate business data in rows.
