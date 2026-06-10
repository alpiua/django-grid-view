---
name: grid-view-spec-mcp
description: Use GridViewSpec MCP tools when authoring dashboard pages to grid-view-spec v2 (NSZU, Commerce, host apps). Start with gridview_catalog, then gridview_validate before any render change.
---

# gridviewspec-mcp

MCP server CLI: **`gridviewspec-mcp`** → `grid_view_spec.mcp` (no Django runtime).

Install: `pip install "grid-view-spec[mcp]"` or `./scripts/install-mcp-cli.sh` — see [mcp-server.md](../../docs/tools/mcp-server.md).

## When to use

- Authoring `GridViewSpec` JSON or Python dataclasses for a new dashboard page
- LLM/chat output that must become a valid spec before merge
- Choosing Django vs Starlette wiring, prefs POST, or export mount — read catalog host sections first

## Workflow (strict order)

1. **`gridview_catalog`** — blocks, area types, rules, **`host_backends`**, **`host_protocol`**, **`http_routes`**
2. **`gridview_examples`** — `minimal_valid_spec` or rich fixture as a starting skeleton
3. **`gridview_schema`** — field-level JSON Schema for a block type
4. Build spec in host `page_data` (Python) or wire JSON
5. **`gridview_validate`** — stop until `ok: true` (no error diagnostics)
6. **`gridview_normalize`** — apply before committing wire JSON
7. **`gridview_apply_patch`** — small incremental edits only; always re-validate

## Host integration (from catalog)

| Topic | Catalog key | Human doc |
|-------|-------------|-----------|
| Render backends | `host_backends` | [host-contract.md](../../docs/integration/host-contract.md) |
| `GridViewHost` methods | `host_protocol` | same |
| Prefs / export URLs | `http_routes` | [django.md](../../docs/integration/django.md), [preferences.md](../../docs/persistence/preferences.md) |
| Table `simple` vs `ag_grid` | `table_backends` | [tables/index.md](../../docs/tables/index.md) |

### Django checklist (after spec validates)

1. `INSTALLED_APPS` + `migrate django_grid_view`
2. Mount prefs: `include("django_grid_view.urls")` or explicit `name="api_grid_preferences"`
3. Export (optional): register builders in `AppConfig.ready()` + mount `export_pdf` / `export_xlsx` **with auth**
4. Template: `{% grid_view_bundle %}` + `{% render_grid_view_spec %}`

### Starlette / FastAPI

- Bundled: GET page HTML only (`mount_page` / `page_route`)
- Not bundled: prefs POST, export — implement `GridViewHost.save_grid_prefs` + routes if needed
- Default prefs are in-memory (`MemoryPrefs`); lost on restart

## Do not

- Render HTML via MCP (non-goal)
- Skip validate because “it looks fine”
- Use `action.target` as export builder key — use `params.builder` or `spec.id`
- Assume `include("django_grid_view.urls")` mounts export — only prefs by default
- Put ORM, callables, or request objects in spec JSON

## Coexist with host MCP

NSZU: **`contextmed-mcp`** for doctors/departments/EMZ reference data;
**`gridviewspec-mcp`** for grid page structure and host HTTP contract only.
