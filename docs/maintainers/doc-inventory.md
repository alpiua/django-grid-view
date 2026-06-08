# Documentation inventory

Maintainer reference: which docs describe the **current** GridViewSpec v2 surface, which are
**legacy**, and what can be **removed** after host migration completes (NSZU, Commerce, and other
hosts off the v1 path).

Status key: **Current** · **Legacy (keep until sunset)** · **Maintainer-only** · **Remove after Phase 12**

## Current — public site (MkDocs)

| File | Status | Notes |
|------|--------|-------|
| `index.md` | Current | Product home; `grid_view_spec` first |
| `getting-started.md` | Current | v2 first page; Django as optional backend |
| `architecture.md` | Current | Overview; links to maintainer deep spec |
| `reference/grid-view-spec.md` | Current | v2 contract; v1 one paragraph |
| `reference/javascript.md` | Current | Unified `grid-view.min.js` |
| `reference/template-tags.md` | Current | Includes `render_grid_view_spec` |
| `reference/python-types.md` | Mixed | Split v1/v2 sections when editing |
| `guides/mcp-server.md` | Current | `pip install [mcp]` → `gridviewspec-mcp` CLI |
| `guides/pdf-export.md`, `xlsx-export.md` | Current | vNext registry + Django views |
| `guides/host-app-page-export.md` | Current | Page loader pattern |
| `guides/server-filtering-contract.md` | Current | Host queryset contract |
| `ag-grid.md` | Current | AG-Grid + `GridViewTable(backend="ag_grid")` |
| `preferences.md` | Current | `GridPreference` / column presets |
| `legacy/index.md` | Current | Index of sunset docs |

## Legacy — keep until host gates pass

Remove from main nav first; delete files only after **Phase 12** (no production use of v1 APIs).

| File | v2 replacement | Delete when |
|------|----------------|-------------|
| `simple-table.md` | `GridViewTable(backend="simple")` | No `SimpleTableConfig` in hosts |
| `grid-view-artifacts.md` | `GridViewSpec` blocks | No `GridArtifact` / `render_grid_view` |
| `charts-and-kpis.md` | `GridViewKpi`, charts blocks | No v1 `ChartSpec` on pages |
| `guides/dashboard-builders.md` | `page_data` + spec blocks | Builders migrated |
| `guides/filter-semantics-contract.md` | `GridViewFilters` | Overlaps v2 filters doc only |
| `guides/chat-visualizer.md` | v2 wire + validate | Chat emits v2 spec only |

After deletion, redirect old URLs in `mkdocs.yml` redirects (if added) or changelog entry.

## Maintainer-only — exclude from user nav

Not end-user documentation. Keep in repo; do not present as primary reading.

| File | Purpose |
|------|---------|
| `gridviewspec-architecture.md` | Full v2 design (~2700 lines) |
| `grid-view-spec.mcp` | MCP tool contract (reference, not tutorial) |
| `vnext/deprecation-targets.md` | Symbol-level kill list |
| `vnext/phase-11-prep.md` | Migration window checklist |
| `maintainers/doc-inventory.md` | This file |

Consider moving `gridviewspec-architecture.md` to `docs/maintainers/` in a follow-up (many inbound links).

## LLM bundle — separate audience

| File | Status |
|------|--------|
| `llm/django-grid-view-llm-context.md` | Generated; agents, not humans |
| `llm/context.md` | Download instructions for bundle |
| `llm/skill.md` | Agent skill pointer |

Do not merge into MkDocs user nav. Regenerate with `scripts/build_llm_context.py` after user doc edits.

## Obsolete / redundant (candidates)

| Item | Action |
|------|--------|
| `guides/mcp-cursor-setup.md` | **Deleted** — was redirect stub; use `guides/mcp-server.md` |
| Duplicate legacy markers in user docs | Removed during rewrite; legacy isolated under `legacy/` |
| `grid-view-spec.mcp` § Implementation Phases M0–M7 | Trimmed — historical rollout, not user docs |
| Nav entry “GridViewSpec architecture” → full `gridviewspec-architecture.md` | Removed from user nav; link from Architecture |

## Phase 12 deletion checklist (docs)

When `rg` shows zero v1 API use in host repos:

1. Delete legacy user guide files listed above  
2. Remove `legacy/` section from MkDocs  
3. Trim v1 sections from `reference/python-types.md` and `reference/grid-view-spec.md`  
4. Update `scripts/build_llm_context.py` SOURCES list  
5. Run `test_gridviewspec_docs_contract.py` and fix guards  
6. Changelog note under next major version  

## Phase 12 deletion checklist (code — not docs)

Tracked in `vnext/deprecation-targets.md` (Python modules, templates, static boots). Docs sunset
follows code sunset, not the reverse.
