# Charts and KPIs

> **Legacy API.** On new pages, use `GridViewKpi` and chart blocks inside a
> [GridViewSpec](reference/grid-view-spec.md). This page covers KPI and chart helpers on the flat
> `GridViewSpec` used with `{% render_grid_view %}`.

KPI values and chart series are always computed in Python from `rows`. The spec carries labels and
wiring only.

## KPI strip (server-resolved)

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

Charts need `window.echarts` on the page:

```django
{% load django_grid_view %}
<script src="{% echarts_cdn_url %}"></script>
```

Optional setting for the CDN version:

```python
DJANGO_GRID_VIEW_ECHARTS_VERSION = "5.5.1"
```

Build runtime config from rows:

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

When KPIs or charts must follow **visible** AG-Grid rows after filter or sort:

```django
{% render_grid_kpi_strip specs %}
```

In JavaScript:

```javascript
var adapter = GridView.createAgGridAdapter(gridApi);
GridView.bindGridKpis({ root: document, gridAdapter: adapter });
GridView.bindGridFilteredCharts(document, adapter);
```

`ChartSpec.data_source` is `static` (artifact rows) or `grid_filtered` (adapter rows).

## Unified layout on one page

When KPI, chart, and table share the same `rows`, build one artifact:

```python
from django_grid_view.render import GridRenderer

artifact = GridRenderer.build(spec, rows)
```

```django
{% render_grid_view artifact %}
```

Types: [Python types — legacy](reference/python-types.md#legacy-flat-spec).

See [Grid View artifacts](grid-view-artifacts.md) for the full render flow.
