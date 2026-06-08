# MCP server

The **gridviewspec-mcp** server exposes read-mostly tools for working with GridViewSpec JSON:
catalog, schema, validation, normalization, examples, migration hints, and A2UI patches.

It runs as a separate process (stdio). It does not render HTML and does not need a web framework.

## Install

Installing the package with the **`[mcp]` extra** registers the **`gridviewspec-mcp`** command
automatically — same `pip install`, no separate MCP step.

```bash
pip install "django-grid-view[mcp]"
gridviewspec-mcp --help
```

The script is placed in the **same bin directory as pip** for that install:

| Install mode | CLI location |
|--------------|--------------|
| virtualenv | `venv/bin/gridviewspec-mcp` |
| `pip install --user` | `~/.local/bin/gridviewspec-mcp` |
| system-wide pip | system `bin/` (e.g. `/usr/local/bin`) |

Editable checkout:

```bash
pip install --user -e "/path/to/django-grid-view[mcp]"
# or
./scripts/install-mcp-cli.sh
```

Alternative entry (same server):

```bash
python -m grid_view_spec.mcp --help
```

Deprecated CLI names still work: `grid-view-spec-mcp`, `django-grid-view-mcp`.

## MCP client configuration

Point your MCP client at the installed command. Example `.mcp.json`:

```json
{
  "mcpServers": {
    "gridviewspec-mcp": {
      "command": "gridviewspec-mcp",
      "args": []
    }
  }
}
```

If the client does not inherit your shell `PATH`, use the full path from `which gridviewspec-mcp`.
Template: [.mcp.json.example](../.mcp.json.example).

Optional policy flags in `args`:

```json
"args": ["--policy-allow-raw-html", "--policy-strict-unknown-config"]
```

Fallback when only a venv Python is available:

```json
{
  "command": "/path/to/venv/bin/python",
  "args": ["-m", "grid_view_spec.mcp"]
}
```

Tool names are prefixed with `gridview_`.

## Typical workflow

1. `gridview_catalog` — block types and layout rules  
2. `gridview_migration_hints` — map an old template tag or API name to v2 blocks  
3. `gridview_examples` — start from a fixture (`minimal_valid_spec`, …)  
4. Draft or patch a spec  
5. `gridview_validate` — fix until `ok: true`  
6. `gridview_normalize` — stable field order before commit  

## Tools

| Tool | Purpose |
|------|---------|
| `gridview_catalog` | Supported blocks, area types, registries |
| `gridview_schema` | JSON Schema for `GridViewSpec` or a `$defs` target |
| `gridview_validate` | Structural and policy validation |
| `gridview_normalize` | Defaults and ordering |
| `gridview_examples` | Fixture specs |
| `gridview_migration_hints` | Legacy pattern → v2 mapping |
| `gridview_a2ui_catalog` | A2UI projection catalog |
| `gridview_apply_patch` | Apply atomic patch operations |

Every tool returns the same envelope: `{ ok, tool, data, diagnostics }`.

Full request/response shapes: [grid-view-spec.mcp](../grid-view-spec.mcp) in the repository.

## Upgrade

```bash
pip install --upgrade "django-grid-view[mcp]"
```

Editable installs pick up code changes immediately; re-run `./scripts/install-mcp-cli.sh` only after
dependency or entry-point changes in `pyproject.toml`.

## Host-specific wrappers

Applications may wrap this server (for example with local page examples). The generic tools stay
schema-only so they work across different host codebases.
