---
name: grid-view-spec-mcp
description: Use GridViewSpec MCP tools when authoring or migrating dashboard pages to grid-view-spec v2 (NSZU, Commerce, host apps). Start with gridview_catalog and gridview_migration_hints, then gridview_validate before any render change.
---

# gridviewspec-mcp

MCP server CLI: **`gridviewspec-mcp`** → `grid_view_spec.mcp` (no Django runtime).

Install: `pip install "django-grid-view[mcp]"` or `./scripts/install-mcp-cli.sh` — see [mcp-server.md](../../docs/guides/mcp-server.md).

## When to use

- Migrating a page from `GridArtifact` / `SimpleTableConfig` / legacy template tags
- Authoring `GridViewSpec` JSON or Python dataclasses for a new dashboard page
- LLM/chat output that must become a valid spec before merge

## Workflow (strict order)

1. **`gridview_catalog`** — block types, area types, rules
2. **`gridview_migration_hints`** — pass legacy patterns (`render_grid_view`, `SimpleTableConfig`, …)
3. **`gridview_examples`** — `minimal_valid_spec` or rich fixture as a starting skeleton
4. **`gridview_schema`** — when you need field-level JSON Schema for a block type
5. Build spec in host `page_data` (Python) or wire JSON
6. **`gridview_validate`** — stop until `ok: true` (no error diagnostics)
7. **`gridview_normalize`** — apply before committing wire JSON
8. **`gridview_apply_patch`** — small incremental edits only; always re-validate

## Do not

- Render HTML via MCP (non-goal)
- Skip validate because “it looks fine”
- Use `action.target` as export builder key — use `params.builder` or `spec.id`

## Coexist with host MCP

NSZU: **`contextmed-mcp`** for doctors/departments/EMZ reference data;
**`gridviewspec-mcp`** for grid page structure only.
