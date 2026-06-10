# JSON Schema

Wire format for `GridViewSpec` v2:

**Repository file:** [`schema/grid-view-spec.v2.json`](https://github.com/alpiua/grid-view-spec/blob/main/schema/grid-view-spec.v2.json)

## Python wire helpers

```python
from grid_view_spec.validate import spec_from_wire, spec_to_wire

wire_dict = spec_to_wire(spec)
spec = spec_from_wire(wire_dict)
```

## MCP

- `gridview_schema` — schema fragment for tooling
- `gridview_validate` — structural diagnostics on wire JSON

[MCP server](../tools/mcp-server.md)

## MCP contract file

Maintainer reference (not a tutorial): `docs/grid-view-spec.mcp` in the repository.
