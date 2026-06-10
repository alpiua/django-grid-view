# KPI and charts

Values always come from Python `rows`. The spec carries wiring only.

## GridViewKpi

```python
GridViewKpi(
    id="summary_kpi",
    items=(
        GridViewKpiItem(id="total", label="Total", field="amount", aggregate="sum", format="number"),
        GridViewKpiItem(id="count", label="Records", field="id", aggregate="count"),
    ),
    presentation="strip",  # strip | grid
    columns=4,
)
```

Host `page_data` resolves aggregates before render. Do not put computed numbers in untrusted spec input.

## GridViewCharts

```python
GridViewCharts(
    id="trend_charts",
    charts=(
        GridViewChart(
            id="monthly",
            type="bar",
            title="By month",
            x="month",
            y=("amount",),
            data=(),  # filled by host from rows
        ),
    ),
    presentation="grid",
    filters="page_filters",  # optional — same filter block id as toolbar
)
```

Host base template must load ECharts:

```django
<script src="{{ echarts_cdn_url }}"></script>
```

Optional charts filter reference documents intent; host still supplies filtered `data` in `page_data`.

## AG-Grid KPI strip

Filtered KPI strip can bind to a live grid adapter:

```javascript
GridView.bindGridKpis({ gridAdapter: GridView.createAgGridAdapter(gridApi) });
```
