"""Static GridViewSpec capability catalog (no I/O)."""

from __future__ import annotations

from grid_view_spec.mcp.envelope import McpEnvelope, envelope
from grid_view_spec.mcp.examples import FIXTURE_CASE_IDS
from grid_view_spec.mcp.schema import SCHEMA_TARGETS, available_targets

TOOL_NAME = "gridview_catalog"

BLOCKS: tuple[str, ...] = (
    "GridViewHeader",
    "GridViewToolbar",
    "GridViewFilters",
    "GridViewActions",
    "GridViewTable",
    "GridViewCharts",
    "GridViewKpi",
    "GridViewCards",
    "GridViewCardGroups",
    "GridViewGallery",
    "GridViewImage",
    "GridViewTabs",
    "GridViewNav",
    "GridViewContent",
    "GridViewForm",
    "GridViewOverlay",
    "GridViewTemplate",
)

AREA_TYPES: tuple[str, ...] = (
    "stack",
    "grid",
    "sidebar",
    "split",
    "tabs",
    "modal",
    "table-card",
)

RENDERERS: tuple[str, ...] = (
    "badge",
    "tag",
    "link",
    "money",
    "progress",
    "date",
    "image",
    "thumbnail",
    "button",
    "chip",
    "period_pills",
    "select",
)

VALIDATORS: tuple[str, ...] = (
    "required",
    "email",
    "url",
    "number",
    "integer",
    "min",
    "max",
    "min_length",
    "max_length",
    "pattern",
    "domain",
    "custom",
)

EDITOR_TYPES: tuple[str, ...] = (
    "text",
    "textarea",
    "number",
    "select",
    "multiselect",
    "date",
    "date_range",
    "boolean",
    "file",
)

HOST_BACKENDS: tuple[dict[str, str], ...] = (
    {
        "id": "django",
        "render_entry": (
            "grid_view_spec.backends.django — DjangoGridViewHost, {% render_grid_view_spec %}"
        ),
        "install": (
            "pip install grid-view-spec[django]; "
            "INSTALLED_APPS += grid_view_spec.backends.django; migrate"
        ),
        "prefs": "DjangoOrmPrefs → GridPreference ORM; default POST /grid/preferences/",
        "export_http": (
            "include grid_view_spec.backends.django.urls or mount same names; "
            "register_pdf_export / register_xlsx_export in AppConfig.ready()"
        ),
        "docs": "docs/integration/django.md, docs/integration/django-host-extensions.md",
    },
    {
        "id": "jinja2",
        "render_entry": "grid_view_spec.backends.jinja2.render_html(spec, rows, host=…)",
        "install": "grid-view-spec core (no Django)",
        "prefs": "Any GridViewHost implementation; no bundled HTTP",
        "export_http": "Host responsibility",
        "docs": "docs/integration/host-contract.md",
    },
    {
        "id": "starlette",
        "render_entry": ("grid_view_spec.backends.starlette — StarletteGridViewHost, page_route()"),
        "install": 'pip install "grid-view-spec[starlette]"',
        "prefs": "InMemoryHost / MemoryPrefs in-process only; no default POST route",
        "export_http": "No bundled ASGI export routes",
        "docs": "docs/integration/host-contract.md",
    },
    {
        "id": "fastapi",
        "render_entry": (
            "grid_view_spec.backends.fastapi — mount_page(router, path, spec=…, rows=…)"
        ),
        "install": 'pip install "grid-view-spec[fastapi]"',
        "prefs": "Same as starlette (InMemoryHost default)",
        "export_http": "Host responsibility",
        "docs": "docs/integration/host-contract.md",
    },
    {
        "id": "wire",
        "render_entry": "grid_view_spec.backends.json — spec_to_wire, validation, MCP tools",
        "install": 'pip install "grid-view-spec[mcp]" for gridviewspec-mcp CLI',
        "prefs": "N/A at wire layer",
        "export_http": "N/A",
        "docs": "docs/tools/mcp-server.md",
    },
)

HOST_PROTOCOL: dict[str, object] = {
    "type": "GridViewHost",
    "module": "grid_view_spec.types.host",
    "not_in_spec": "Callables and request/ORM never appear in wire JSON",
    "methods": [
        {
            "name": "translate",
            "purpose": "i18n msgid → localized string for package templates/JS",
        },
        {
            "name": "url_for",
            "purpose": "Resolve logical routes: grid_prefs, export_pdf, export_xlsx, lazy",
        },
        {
            "name": "template_exists",
            "purpose": "Check host-owned GridViewTemplate file",
        },
        {
            "name": "render_host_template",
            "purpose": "Render GridViewTemplate block body",
        },
        {
            "name": "get_grid_prefs",
            "purpose": "Load named column presets + saved searches for subject_id + grid_id",
        },
        {
            "name": "save_grid_prefs",
            "purpose": "Persist prefs; optional when host has no storage",
        },
        {
            "name": "filter_state_from_request",
            "purpose": "Parse filter selection from request without ORM",
        },
        {
            "name": "current_subject_id",
            "purpose": "Opaque authenticated subject (user pk, token subject, …)",
        },
    ],
    "host_responsibilities": [
        "Rows and KPI/chart values from host page_data only — not from spec layout",
        "Permissions resolved before spec build — package does not call tenant/Brain APIs",
        "subject_id must match authenticated user when saving prefs",
        "GridViewTemplate is trusted host content",
    ],
}

TABLE_BACKENDS: tuple[dict[str, str], ...] = (
    {
        "id": "simple",
        "meaning": "Server-rendered HTML table; client sort/search/filters",
    },
    {
        "id": "ag_grid",
        "meaning": "AG Grid Community; optional infinite datasource; column_settings + prefs POST",
    },
)

HTTP_ROUTES: dict[str, object] = {
    "logical_routes": {
        "grid_prefs": "POST save named presets and searches",
        "export_pdf": "GET PDF via ?builder=<registry_key>",
        "export_xlsx": "GET XLSX via ?builder=<registry_key>",
        "lazy": "GET HTMX lazy block fragment",
    },
    "django_defaults": {
        "module": "grid_view_spec.backends.django.urls",
        "included_routes": [
            {
                "path": "grid/preferences/",
                "name": "api_grid_preferences",
                "view": "save_grid_prefs",
                "auth": "login_required",
            },
            {
                "path": "grid/export/pdf/",
                "name": "api_export_pdf",
                "view": "export_pdf",
                "auth": "export_throttle only — host may wrap login_required",
            },
            {
                "path": "grid/export/xlsx/",
                "name": "api_export_xlsx",
                "view": "export_xlsx",
                "auth": "export_throttle only — host may wrap login_required",
            },
            {
                "path": "grid/lazy/",
                "name": "lazy",
                "view": "load_lazy_block",
                "auth": "host must add if needed",
            },
            {
                "path": "grid/filter-dictionary/",
                "name": "api_column_filter_dictionary",
                "view": "column_filter_dictionary",
                "auth": "host must add if needed",
                "purpose": (
                    "faceted distinct values + counts for one column/facet "
                    "(AG-Grid set filter); exclude-own semantics"
                ),
            },
        ],
        "not_included_by_default": [],
        "mount_patterns": [
            'path("", include("grid_view_spec.backends.django.urls"))',
            "Explicit path() with same name=api_grid_preferences contract",
        ],
    },
    "starlette_fastapi": {
        "bundled": "GET page HTML via page_route / mount_page only",
        "not_bundled": "POST prefs, export PDF/XLSX — host implements if needed",
        "default_prefs": "MemoryPrefs in-process; lost on restart unless host overrides",
    },
    "export_registry": {
        "register": "register_pdf_export(key, fn), register_xlsx_export(key, fn) at startup",
        "action_wire": "GridViewExportAction uses params.builder or spec.id — not action.target",
        "why_not_default_url": (
            "Builders run host queries (data dump); empty registry → 404; "
            "optional weasyprint/xlsxwriter deps"
        ),
    },
    "browser_session": {
        "localStorage": "Column layout, filters, quick search — all backends",
        "preferencesUrl": (
            "From {% grid_view_spec_assets part='js' %}; "
            "empty disables POST, localStorage still works"
        ),
    },
    "settings": {
        "GRID_VIEW_SPEC_EXPORT_PDF_URL": "URL name for export_pdf (default api_export_pdf)",
        "GRID_VIEW_SPEC_EXPORT_XLSX_URL": "URL name for export_xlsx (default api_export_xlsx)",
        "GRID_VIEW_SPEC_GRID_PREFERENCES_URL": (
            "URL name for save_grid_prefs (default api_grid_preferences)"
        ),
        "GRID_VIEW_SPEC_LAZY_URL": "URL name for load_lazy_block (default lazy)",
    },
    "facets": {
        "enable": (
            "GridViewFilters(facets=True) — host recomputes each filter's options + "
            "counts against the currently filtered table"
        ),
        "exclude_own": (
            "a facet's options/counts reflect rows left after all OTHER active filters + "
            "search (you can still broaden a multiselect facet)"
        ),
        "row_core": (
            "grid_view_spec.search.facets.compute_row_facets (in-memory rows; Starlette/Forge)"
        ),
        "orm_adapter": (
            "grid_view_spec.backends.django.facets.compute_queryset_facets (Django ORM)"
        ),
        "registry": (
            "register_facet_source(grid_id, FacetSource(schema, apply_filters, "
            "column_field, is_orm)) resolves a grid's faceting inputs at request time; "
            "consumed by the api_column_filter_dictionary view"
        ),
        "option_fields": (
            "GridViewFilterOption.count (int|null) + .disabled (bool) carry facet counts; "
            "wire-decoded round-trip"
        ),
        "docs": "docs/filtering/facets.md",
    },
}

RULES: tuple[str, ...] = (
    "blocks are defined in spec.blocks",
    "layout references block ids",
    (
        "block ids are globally unique across the whole spec tree, "
        "including nested overlay/lazy specs"
    ),
    "use type as discriminator; visual variants use presentation; no kind/variant/*_type",
    "GridViewToolbar is always a layout block; no page/embedded modes; bind via target",
    "in-card chrome = a table-card area holding [toolbar(target=table_id), table]",
    "at most one toolbar search per table (XOR)",
    "GridViewFilters.target is explicit (null = page-wide; block id = scoped)",
    (
        "faceting: GridViewFilters.facets=True makes the host recompute each filter's "
        "options + counts on the currently filtered table (exclude-own); register a "
        "FacetSource per grid for the api_column_filter_dictionary endpoint — "
        "see docs/filtering/facets.md"
    ),
    "custom cells use GridViewColumn.renderer (registry id), never inline JS",
    (
        "images use GridViewGallery / GridViewImage / renderer=image; "
        "spec carries resolved URLs only — image backend is a host builder, never in the spec"
    ),
    "inline editing uses GridViewTable.edit + GridViewColumn.editable",
    "GridViewForm is the declarative form; GridViewTemplate is bespoke host content only",
    "spec values must be JSON-serializable (JsonValue); no callables, ORM, or request",
    "GridViewTemplate is trusted file/raw template content",
    (
        "semantic UI: GridViewSemanticTone (default|info|success|warning|danger) on "
        "GridViewContent.tone, GridViewTab.badge_tone, GridViewActionBase.tone; "
        "roles callout|banner on GridViewContent; variant on actions (segment for pill tabs)"
    ),
    (
        "pseudo-toast (variant A): GridViewContent.extra.initial_hidden + "
        "GridViewButtonAction(action=show_content, target=block_id); no toast stack"
    ),
    (
        "semantic extras: extra.nav_class, extra.badge_tones, "
        "column.extra.pill_class map to GridViewSemanticTone tokens"
    ),
    "GridViewHost is runtime-only — never serialize host methods into spec JSON",
    (
        "Django prefs: migrate grid_view_spec.backends.django; mount api_grid_preferences "
        "(include grid_view_spec.backends.django.urls or explicit path)"
    ),
    (
        "Export: include grid_view_spec.backends.django.urls or mount same URL names; "
        "register builders in AppConfig.ready()"
    ),
    (
        "Starlette/FastAPI: no default prefs POST or export — "
        "implement GridViewHost + routes if needed"
    ),
    (
        "AG Grid column.renderer uses package builtins (money, link, badge, date, button); "
        "pass renderer params via column.extra → cellRendererParams"
    ),
    (
        "Simple table renderers: server-side Jinja in table.html; "
        "AG Grid: client getRegisteredRenderer()"
    ),
)


def run_catalog() -> McpEnvelope:
    return envelope(
        TOOL_NAME,
        {
            "root": "GridViewSpec",
            "blocks": list(BLOCKS),
            "area_types": list(AREA_TYPES),
            "registries": {
                "renderers": list(RENDERERS),
                "validators": list(VALIDATORS),
                "editor_types": list(EDITOR_TYPES),
            },
            "rules": list(RULES),
            "host_backends": list(HOST_BACKENDS),
            "host_protocol": HOST_PROTOCOL,
            "table_backends": list(TABLE_BACKENDS),
            "http_routes": HTTP_ROUTES,
            # Discovery pointers for the other tools, so an agent needs one call.
            "schema_targets": list(available_targets()),
            "featured_schema_targets": sorted(SCHEMA_TARGETS),
            "example_cases": list(FIXTURE_CASE_IDS),
            "integration_docs": "docs/integration/host-contract.md",
        },
        [],
    )
