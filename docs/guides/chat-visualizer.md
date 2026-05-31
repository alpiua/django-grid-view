# Chat visualizer wire contract

How a Django chat app turns analytics SQL results into a **`grid_view`** UI component using django-grid-view.

Router prompts, graph wiring, and component extraction live in **your application**. This package provides `build_artifact_from_view` and `GridView.init`.

---

## End-to-end flow

```
User question
  → Router graph: planner → SQL tool → verifier → end
  → Django: extract_components(graph_state)
       SQL rows + planner hints → GridViewSpec (Python)
       → build_artifact_from_view(spec, rows) → GridArtifact
  → SSE/JSON: { "type": "grid_view", "artifact": …, "rows": … }
  → Frontend: renderGridView → GridView.init({ root, artifact })
```

**Invariant:** row data and KPI numbers never come from a dedicated “visualizer” LLM. SQL returns rows; your Django code builds the view spec and resolves aggregates.

---

## Recommended: planner-driven presenter (no visualizer LLM)

Use a Router graph with **planning, SQL execution, and verification only** — no extra node whose job is to emit a full grid layout.

Typical graph shape:

1. **Planner** (`llm`, JSON output) — produces the query and how to present results.
2. **SQL tool** — runs the query; state gets `columns` and `rows`.
3. **Verifier** (`llm`, optional loop) — checks the result; on success the graph ends.

### Planner output (not `GridViewSpec`)

The planner model returns JSON with SQL and presentation hints only:

```json
{
  "sql": "SELECT name AS doctor_name, COUNT(*) AS total_records FROM …",
  "purpose": "Doctors with the most rejections",
  "format": "table"
}
```

| `format` | Typical layout (built in your app) |
|----------|-------------------------------------|
| `table` | title, kpis, table |
| `report` | title, kpis, chart, table |
| `chart` | title, kpis, chart, table |
| `answer` | title, kpis |

Define a strict JSON schema (`sql`, `purpose`, `format`) in the planner prompt.  
**Forbidden in planner output:** `rows`, KPI values, a `view` object, `echarts_option`.

After the SQL step, graph state should expose result rows (e.g. under `final_output` or `intermediate_results` for the tool node) plus planner fields for `purpose` and `format`.

### Python presenter

In your app (e.g. `extract_components`):

1. Read SQL result (`columns`, `rows`) from the Router payload.
2. Read `purpose` and `format` from the planner step.
3. Build a `GridViewSpec` wire dict in Python — column labels, KPI candidates, chart choice, `layout.blocks` from `format` and column types.
4. Build a typed wire dict (`GridViewSpecWire`) or `GridViewSpec`, then `build_artifact_from_view(spec, rows)` → resolved `GridArtifact`.
5. Emit one chat component:

```python
{
    "type": "grid_view",
    "title": "…",
    "artifact": artifact.to_json(),
    "columns": [...],
    "rows": [...],
}
```

On the Router `result` event, map graph state → `components` and stream or return JSON to the browser.

### Frontend

Register a `grid_view` widget that mounts KPI/chart/table DOM from `artifact` and calls:

```javascript
GridView.init({ root: wrap, artifact: c.artifact });
```

Load `grid-view.js` and ECharts on the chat page (same bundle as dashboards).

### Package API

```python
from django_grid_view.types import GridArtifactJson, GridViewSpecWire, JsonObject, RowDict
from django_grid_view.render import GridRenderer, build_artifact_from_view, parse_grid_view_spec

sql_rows: list[RowDict] = [...]

# Presenter builds wire spec in Python
view: GridViewSpecWire = {"grid_id": "analytics", "columns": [...], "kpis": [...]}
artifact = GridRenderer.build(parse_grid_view_spec(view), sql_rows)

# Or loose JSON / visualizer LLM output
raw: JsonObject = {"grid_id": "analytics", "columns": [...]}
artifact = build_artifact_from_view(raw, sql_rows)

payload: GridArtifactJson = artifact.to_json()
```

Imports: [Python types](../reference/python-types.md).

---

## Alternative: dedicated visualizer LLM node

Some integrations add a **second LLM node** after SQL that emits layout JSON. The model returns structure only:

```json
{
  "view": {
    "grid_id": "analytics-result",
    "columns": [{ "key": "doctor_name", "label": "Doctor" }],
    "kpis": [{ "label": "Records", "aggregate": "count" }],
    "charts": [],
    "layout": { "blocks": ["title", "kpis", "table"] }
  }
}
```

Use a generic LLM node with `output_format: json`. Avoid legacy platform-specific `sql_visualizer` executors unless you still depend on them.

**Forbidden** in visualizer output: `rows`, row data, numeric KPI values, `echarts_option`, SQL text.

You must still call `build_artifact_from_view(view, sql_rows)` in Django so numbers come from SQL rows, not the model.

---

## Choosing an approach

| Approach | Graph | LLM emits | Who builds `GridViewSpec` |
|----------|-------|-----------|---------------------------|
| **Planner-driven presenter** | planner → SQL tool → verifier | `sql`, `purpose`, `format` | Your Python presenter |
| **Visualizer LLM** | planner → SQL tool → visualizer → … | `{ "view": … }` | Visualizer LLM, then `build_artifact_from_view` |

Checklist:

1. **Graph** — no visualizer node unless you need model-chosen layouts.
2. **Planner prompt** — SQL + `format`, not a full grid spec ([GridViewSpec reference](../reference/grid-view-spec.md) documents the presenter output).
3. **Adapter** — graph state → `grid_view` component; see [Grid View artifacts](../grid-view-artifacts.md).
4. **Frontend** — `GridView.init({ artifact })` in the chat panel.
