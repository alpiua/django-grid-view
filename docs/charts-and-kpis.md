# Charts and KPIs

Grid View 1.0 resolves KPI values and chart bindings in Python from `rows`, then renders ECharts in the browser.

## KPI strip (Python-resolved)

```python
from django_grid_view.types import ColumnFormat, KpiAggregate, KpiSpec, RowDict
from django_grid_view.render.kpi import resolve_kpis

specs = [
    KpiSpec(
        label="Total",
        column_key="amount",
        aggregate=KpiAggregate.SUM,
        format=ColumnFormat.NUMBER,
    ),
]
kpis = resolve_kpis(specs, rows)
```

```django
{% render_kpi_strip kpis columns=4 %}
```

## Charts (static rows)

Requires `window.echarts` on the page. Pin the CDN in settings or load explicitly:

```django
{% load django_grid_view %}
<script src="{{ echarts_cdn_url }}"></script>
```

```python
# settings.py (optional)
DJANGO_GRID_VIEW_ECHARTS_VERSION = "5.5.1"
# from django_grid_view.conf import echarts_cdn_url  # in view context
```

```python
from django_grid_view.types import ChartSpec, ChartType, RowDict, SeriesSpec
from django_grid_view.render.charts import build_chart_runtime

chart = ChartSpec(
    id="main",
    chart_type=ChartType.BAR,
    x_key="name",
    series=(SeriesSpec(key="amount", label="Amount"),),
)
runtime = build_chart_runtime(chart, rows)
```

```django
{% render_chart chart rows %}
```

## AG-Grid–filtered KPIs and charts

When KPIs or charts must reflect **visible** AG-Grid rows after filter/sort:

- Python: `{% render_grid_kpi_strip specs %}` (unresolved specs)
- JS: `GridView.createAgGridAdapter(gridApi)` + `bindGridKpis` / `bindGridFilteredCharts`

`ChartSpec.data_source` can be `static` (artifact rows) or `grid_filtered` (adapter rows).

## Unified layout

Prefer one artifact when KPI, chart, and table share the same `rows`:

```python
from django_grid_view.types import GridViewSpec, RowDict
from django_grid_view.render import GridRenderer

artifact = GridRenderer.build(spec, rows)
```

Types: [Python types](reference/python-types.md).

```django
{% render_grid_view artifact %}
```

See [Grid View artifacts](grid-view-artifacts.md).
