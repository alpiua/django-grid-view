# Chat visualizer

How a chat application turns SQL (or other tabular) results into an interactive grid in the browser.

The host application owns routing, prompts, and graph wiring. This package provides spec validation,
artifact resolution, and `GridView.init` for the client.

## Flow

```
User question
  → Host: run query, build spec in Python
  → Host: validate / resolve rows → payload for the UI
  → SSE or JSON: { "type": "grid_view", "artifact": … }  (legacy)
                 or { "type": "grid_view_spec", "spec": …, "rows": … }  (v2)
  → Browser: mount DOM + GridView.init or render_grid_view_spec HTML
```

**Rule:** row data and KPI numbers always come from the query result in Python. The LLM must not
emit numeric KPI values or row arrays in the layout JSON.

## Recommended: planner-driven presenter

Use a graph with planning, SQL execution, and verification — not a separate “layout LLM” unless you
need model-chosen charts.

1. **Planner** returns SQL and presentation hints only.  
2. **SQL step** produces `columns` and `rows`.  
3. **Verifier** checks the result (optional loop).

### Planner output

```json
{
  "sql": "SELECT name AS customer_name, COUNT(*) AS total_orders FROM …",
  "purpose": "Customers with the most orders",
  "format": "table"
}
```

| `format` | Typical blocks |
|----------|----------------|
| `table` | title, KPIs, table |
| `report` | title, KPIs, chart, table |
| `chart` | title, KPIs, chart, table |
| `answer` | title, KPIs |

Do **not** put in planner output: `rows`, KPI values, a full grid spec, or `echarts_option`.

### Python presenter (GridViewSpec v2)

```python
from grid_view_spec import GridViewSpec, validate_spec
from grid_view_spec.types.layout import GridViewArea, GridViewLayout
from grid_view_spec.types.table_v2 import GridViewColumn, GridViewTable

def present_grid(format: str, purpose: str, columns: list[str], rows: list[dict]):
    spec = GridViewSpec(
        id="analytics",
        blocks=(
            GridViewTable(
                id="result_table",
                backend="simple",
                columns=tuple(
                    GridViewColumn(id=c, label=c.replace("_", " ").title(), field=c)
                    for c in columns
                ),
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("result_table",))),
    )
    validate_spec(spec)
    return {"type": "grid_view_spec", "title": purpose, "spec": spec, "rows": rows}
```

Stream or return that object to the browser. Render with `{% render_grid_view_spec spec rows %}` or
`render_grid_view_spec(spec, rows, host=…)` in a partial.

Validate wire JSON with MCP `gridview_validate` before merge.

## Frontend

```javascript
GridView.init({ root: wrap, artifact: component.artifact });
```

Load `{% grid_view_styles %}`, `{% grid_view_bundle %}`, and ECharts on the chat page.

## Optional visualizer LLM

A second LLM node may emit layout JSON **without rows or numbers**:

```json
{
  "view": {
    "grid_id": "analytics-result",
    "columns": [{ "key": "customer_name", "label": "Customer" }],
    "layout": { "blocks": ["title", "kpis", "table"] }
  }
}
```

Always call `build_artifact_from_view(view, sql_rows)` in Python so aggregates come from SQL, not
the model. For new integrations, prefer emitting v2 `GridViewSpec` wire and validating with
`gridview_validate`.

## Choosing an approach

| Approach | LLM emits | Python builds |
|----------|-----------|---------------|
| Planner + presenter (recommended) | `sql`, `purpose`, `format` | `GridViewSpec` blocks + layout |
| Visualizer LLM | `{ "view": … }` structure only | Spec via host presenter |

## Related

- [GridViewSpec contract](../spec/index.md)  
- [MCP server](mcp-server.md) — validate specs in the IDE
