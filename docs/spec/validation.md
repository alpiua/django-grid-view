# Validation and wire format

## Python validation

```python
from grid_view_spec import validate_spec

validate_spec(spec)  # raises GridViewValidationError on errors
```

Checks include: unique block ids, layout references existing ids, one search per table, filter schema consistency, and optional `GridViewPolicy` gates (`strict_unknown_config`, trusted template modes).

## Wire JSON

```python
from grid_view_spec.validate import spec_from_wire, spec_to_wire

wire = spec_to_wire(spec)
restored = spec_from_wire(wire)
```

Schema: `schema/grid-view-spec.v2.json` in the repository.

## MCP tools

| Tool | Purpose |
|------|---------|
| `gridview_catalog` | Block types, registries, rules |
| `gridview_schema` | JSON Schema fragment |
| `gridview_examples` | Fixture specs by case id |
| `gridview_validate` | Diagnostics on wire JSON |
| `gridview_normalize` | Canonical spec shape |
| `gridview_apply_patch` | Atomic A2UI patch ops |

Install: [MCP server](../tools/mcp-server.md). Contract file: `docs/grid-view-spec.mcp` (maintainer reference).

## A2UI projection

A2UI is an adapter over `GridViewSpec` — not a competing page builder. `apply_a2ui_patch` returns a new immutable spec; errors abort the whole patch.

Details: [Maintainer architecture](../maintainers/gridviewspec-architecture.md#a2ui-projection).
