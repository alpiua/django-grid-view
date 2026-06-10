# Host contract — backends, `GridViewHost`, HTTP routes

GridViewSpec is **framework-agnostic**. The spec describes layout and blocks only. Every runtime
needs a **host adapter** (`GridViewHost`) plus optional **HTTP routes** for persistence, export, and
lazy fragments.

This document is the integration contract for Django, Starlette, FastAPI, and headless renderers.
The same facts are exposed in MCP via `gridview_catalog` → `host_backends`, `host_protocol`,
`http_routes`.

---

## Two “backend” concepts

| Concept | Where | Examples |
|---------|-------|----------|
| **Render backend** | HTTP / framework adapter | Django templates, Jinja2, Starlette, FastAPI, JSON wire |
| **Table backend** | `GridViewTable.backend` field | `simple` (server HTML), `ag_grid` (AG Grid + datasource) |

Do not mix them. A Django app can render `backend="ag_grid"` tables; a Starlette app can render
`backend="simple"` tables.

---

## `GridViewHost` protocol

Defined in `grid_view_spec.types.host.GridViewHost`. **Not part of the spec JSON** — no callables
in wire payloads.

| Method | Responsibility |
|--------|----------------|
| `translate(key)` | i18n for package templates / JS catalog |
| `url_for(route, **params)` | Resolve logical route names (see below) |
| `template_exists(name)` | Host-owned `GridViewTemplate` files |
| `render_host_template(name, context)` | Render host template blocks |
| `get_grid_prefs(subject_id, grid_id)` | Load named column presets + saved searches |
| `save_grid_prefs(subject_id, grid_id, prefs)` | Persist prefs (optional per host) |
| `filter_state_from_request(spec)` | Read filter selection from request (no ORM) |
| `current_subject_id()` | Opaque user/subject id (`user pk`, token subject, …) |

**Host rules (renderer):**

- Domain **rows** come from host `page_data` — the renderer does not query ORM for table bodies.
- **Permissions** are resolved by the host before building the spec; the package does not call Brain
  or tenant APIs.
- `subject_id` must match the authenticated subject when saving prefs.

### Logical route names (`url_for`)

Backend-defined names (Django backend uses `GridViewHostConfig` defaults):

| Route id | Purpose |
|----------|---------|
| `grid_prefs` | POST save named presets / searches |
| `export_pdf` | GET PDF export |
| `export_xlsx` | GET XLSX export |
| `lazy` | GET HTMX lazy block fragment |

Django maps these to URL **names** via `GRID_VIEW_SPEC_*` settings.

---

## Render backends

### Django (`grid_view_spec.backends.django`)

| Piece | Module / entry |
|-------|----------------|
| Host | `DjangoGridViewHost` |
| Prefs storage | `DjangoOrmPrefs` → `grid_view_spec.backends.django.models.GridPreference` |
| Render tag | `{% render_grid_view_spec %}` (`grid_view_spec.backends.django.templatetags`) |
| Views | `save_grid_prefs`, `export_pdf`, `export_xlsx`, `load_lazy_block` |

**Install:** `pip install "grid-view-spec[django]"`, `INSTALLED_APPS += ["grid_view_spec.backends.django"]`,
`python manage.py migrate grid_view_spec_django`.

**Default HTTP routes** (optional include):

```python
path("", include("grid_view_spec.backends.django.urls"))
# → POST /grid/preferences/     (name api_grid_preferences)
# → GET  /grid/export/pdf/      (name api_export_pdf)
# → GET  /grid/export/xlsx/     (name api_export_xlsx)
# → GET  /grid/lazy/            (name lazy)
```

Or register views explicitly (same URL **name** contract). See [Django integration](django.md).

**Export:** register builders in `AppConfig.ready()`. See [Export page pattern](../export/page-pattern.md).

### Jinja2 (`grid_view_spec.backends.jinja2`)

| Piece | Entry |
|-------|-------|
| Render | `render_html(spec, rows, host=…)` |
| Host | Any `GridViewHost` implementation (often `InMemoryHost` in tests) |

No Django, no ORM prefs. Host supplies `translate`, templates, and optionally custom prefs storage
behind `get_grid_prefs` / `save_grid_prefs`.

### Starlette / FastAPI (`grid_view_spec.backends.starlette`, `.fastapi`)

| Piece | Entry |
|-------|-------|
| Host | `StarletteGridViewHost` (extends `InMemoryHost`) |
| Page route | `page_route(spec, rows)` → GET HTML |
| FastAPI helper | `mount_page(router, path, spec=…, rows=…)` |

**Prefs today:** in-process `MemoryPrefs` only — **no default POST route**, no database. Named
presets and saved searches do not survive process restart unless the host implements
`GridViewHost.save_grid_prefs` (Redis, SQL, file, …) and mounts a POST handler that calls it.

**Export today:** no bundled ASGI export routes. Host mounts its own GET handlers or generates files
out-of-band.

**Install extras:** `pip install "grid-view-spec[starlette]"` or `"grid-view-spec[fastapi]"`.

### JSON / wire (`grid_view_spec.backends.json`)

Headless: `spec_to_wire`, validation, MCP tools. No `GridViewHost` at runtime unless the consumer
provides one for rendering.

### In-memory host (tests & scripts)

`grid_view_spec.hosts.memory.InMemoryHost` + `MemoryPrefs` — full protocol, no HTTP.

---

## Persistence — prefs vs session layout

| Storage | What | Backend |
|---------|------|---------|
| `localStorage` | Session column layout, filters, quick search | Browser (all backends) |
| `GridPreference` ORM | Named presets + bookmarked searches | Django only (default adapter) |
| `MemoryPrefs` | Named presets (process lifetime) | Starlette default, tests |

JS reads `window.GridView.preferencesUrl` from `{% grid_view_spec_assets part='js' %}`.
Empty string → POST disabled; session `localStorage` still works.

**Django save API**

| | |
|---|---|
| Method | `POST` |
| URL name | `api_grid_preferences` (configurable) |
| Auth | `@login_required` on `save_grid_prefs` |
| Body | `{ "grid_id", "colPresets", "searches" }` |

See [Saved preferences](../persistence/preferences.md).

---

## Export — registry and HTTP

Export is **host-owned** at the HTTP layer even though builder functions live in the package.

1. Host registers builders: `register_pdf_export(key, …)`, `register_xlsx_export(key, …)` in
   `AppConfig.ready()` (or equivalent startup).
2. Host mounts GET views via `include("grid_view_spec.backends.django.urls")` or explicit paths.
3. Templates / `GridViewExportAction` pass `?builder=<key>` plus the same filter GET params the
   page loader reads.

**Export routes** ship in `grid_view_spec.backends.django.urls` but require registered builders and
host-side authentication — see table below.

| Concern | Prefs default | Export |
|---------|---------------|--------|
| Auth on view | `@login_required` | Throttle only — host must add auth at URL or middleware |
| Empty registry | Harmless (save own prefs) | 404 until builders registered |
| Data access | User's own JSON | Builder runs host queries → **data dump surface** |
| Optional deps | Django ORM only | `weasyprint`, `xlsxwriter` |

Mounting `/export/pdf` and `/export/xlsx` is fine once builders are registered **and** the host
enforces authentication/authorization on those routes.

See [Export page pattern](../export/page-pattern.md), [PDF](../export/pdf.md), [XLSX](../export/xlsx.md).

---

## Optional Python extras

| Extra | Purpose |
|-------|---------|
| `[django]` | Django adapter (included in main package) |
| `[pdf]` | WeasyPrint PDF backend |
| `[xlsx]` | xlsxwriter |
| `[mcp]` | `gridviewspec-mcp` CLI |
| `[starlette]` / `[fastapi]` | ASGI page helpers |

Import laziness: optional PDF/XLSX deps load only when export views run.

---

## Checklist — new Django host page

1. `INSTALLED_APPS` + `migrate grid_view_spec_django`
2. Mount prefs: `include("grid_view_spec.backends.django.urls")` or explicit `api_grid_preferences`
3. `{% grid_view_spec_assets part='css' %}` in `<head>` + `part='js' force_core=True` before `</body>`
4. `page_data` → `GridViewSpec` + rows; `{% render_grid_view_spec page.grid %}`
5. Optional export: register builders + mount `export_pdf` / `export_xlsx` + auth

---

## Checklist — Starlette / FastAPI host page

1. Implement or subclass `GridViewHost` (prefs backend of your choice)
2. `mount_page(router, "/path", spec=…, rows=…)` for GET HTML
3. Optional: POST handler calling `host.save_grid_prefs(subject_id, grid_id, prefs)`
4. Serve static `grid_view_spec/*.min.js` + boot `GridView.bootScope()`
5. Export: custom GET routes or skip server export

---

## MCP discovery

`gridview_catalog` returns `host_backends`, `host_protocol`, and `http_routes` alongside block
types and spec rules. Use it before authoring specs in any host codebase.
