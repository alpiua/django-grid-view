# Python types — public import map

Import from **`grid_view_spec`** at host boundaries. Do not copy type trees locally.

## Core spec

```python
from grid_view_spec import GridViewSpec, validate_spec
from grid_view_spec.types import (
    GridViewActions,
    GridViewArea,
    GridViewCard,
    GridViewCards,
    GridViewChart,
    GridViewCharts,
    GridViewColumn,
    GridViewColumnGroup,
    GridViewContent,
    GridViewCounter,
    GridViewExportAction,
    GridViewField,
    GridViewFilter,
    GridViewFilters,
    GridViewForm,
    GridViewHeader,
    GridViewKpi,
    GridViewLayout,
    GridViewNav,
    GridViewOverlay,
    GridViewSearch,
    GridViewTable,
    GridViewTabs,
    GridViewToolbar,
    JsonScalar,
    JsonValue,
    RowDict,
)
```

## Export

```python
from grid_view_spec.export.registry import (
    GridViewExportJob,
    register_pdf_export,
    register_xlsx_export,
)
from grid_view_spec.export.xlsx import XlsxReport, XlsxSheet
```

Builders: `(GridViewHost, ExportContextLike) → GridViewExportJob`.

## Django backend

```python
from grid_view_spec.backends.django.host import DjangoGridViewHost
from grid_view_spec.backends.django.export import DjangoExportContext
from grid_view_spec.backends.django.ag_grid import (
    InfiniteGridParams,
    parse_infinite_params,
    apply_grid_filters,
    apply_grid_sort,
    parse_active_col_ids,
)
from grid_view_spec.types.ag_grid import AgGridColumnSpec, AgGridPageSpec
from grid_view_spec.backends.django.hrefs import export_pdf_href, export_xlsx_href
from grid_view_spec.backends.django.models import GridPreference
```

## Search (ORM)

```python
from grid_view_spec.backends.django.search import apply_queryset_search
from grid_view_spec.search.smart import parse_smart_query, apply_smart_queryset_search
from grid_view_spec.search.column import parse_column_filters
```

## Render

```python
from grid_view_spec.render import render_grid_view_spec, build_render_context
```

Strict typing: package ships `py.typed`; run `basedpyright --warnings` on host code that constructs specs.
