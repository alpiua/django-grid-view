---
name: gridview-mcp
description: Use GridViewSpec MCP tools when authoring dashboard pages with GridViewSpec.
---

# gridview-mcp — GridViewSpec MCP

Setup: [docs/tools/mcp-server.md](../../docs/tools/mcp-server.md)

## When to use

- Authoring `GridViewSpec` JSON or Python dataclasses for a new dashboard page
- LLM/chat output that must become a valid spec before merge

## Workflow (strict order)

1. **`gridview_catalog`** — block types, area types, rules
2. **`gridview_examples`** — `minimal_valid_spec` or rich fixture as a starting skeleton
3. **`gridview_schema`** — when you need field-level JSON Schema for a block type
4. Build spec in host `page_data` (Python) or wire JSON
5. **`gridview_validate`** — stop until `ok: true` (no error diagnostics)
6. **`gridview_normalize`** — apply before committing wire JSON
7. **`gridview_apply_patch`** — small incremental edits only; always re-validate

## Do not

- Render HTML via MCP (non-goal)
- Skip validate because “it looks fine”
- Use `action.target` as export builder key — use `params.builder` or `spec.id`

## Coexist with host MCP

NSZU: **`contextmed-mcp`** for doctors/departments/EMZ reference data;
**`gridviewspec-mcp`** for grid page structure only.
