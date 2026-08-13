# grid-view-spec — Agent Router

Planning and portfolio-state requests load global `planner`, then
[`.agents/skills/planner/ADDON.md`](.agents/skills/planner/ADDON.md).

No `git commit`, `git push`, `git checkout <file>`, or `git restore` without
explicit user approval.

Load `close-review-findings` before fixing a defect or closing a review,
`commit-workflow` only after explicit commit authorization, and
`agent-instructions` before changing agent guidance.
Repository-specific additions belong in `.agents/skills/<skill>/ADDON.md`; they
must extend, not shadow, the global base skill.

## Routes

- Architecture: [gridviewspec-architecture.md](docs/maintainers/gridviewspec-architecture.md).
- Docs: [.agents/skills/grid-view-spec-docs/SKILL.md](.agents/skills/grid-view-spec-docs/SKILL.md).
- Behavior: global `acdd-flow` + [`.acdd/kilo.yaml`](.acdd/kilo.yaml).
- Quality: [code-quality.md](../../contextunity/docs/architecture/code-quality.md).

## Guards

```bash
uv run ruff check src/grid_view_spec tests
uv run basedpyright --warnings src/grid_view_spec tests
uv run pytest -q
```

- Boundaries: no `Any`, `cast`, pyright ignore; use narrowing/`TypeGuard`/
  `Protocol`/`TypedDict`/`JsonValue`.
- Tests: observable HTTP/output/wire behavior; no source-text assertions. Bad
  page/block input: explicit rejection.
- Core: no runtime `django.db` import. Export/import seam:
  `tests/test_gridviewspec_export.py::test_pipeline_module_has_no_runtime_django_bindings`.
- No discarded host/protocol parameter, circular-import workaround, generic
  `helpers.py`, or command module over 400 lines.

## Skill routing

| Trigger | Route |
|---|---|
| Behavior/regression | `acdd-flow` Contract proof policy; under `deferred-final-test`, global `test-contract-seam` after review convergence |
| Typing/payload boundary | [ContextUnity contract-boundary guidance](../../contextunity/.acdd/guidance/contract-boundaries.md) → named verification lane |
| Export/render/host | Architecture doc + export/render tests |
| MCP migration | `grid-view-spec-mcp` + [MCP guide](docs/tools/mcp-server.md) |
| Django/HTMX | `tests/test_gridviewspec_django_views.py` |
| Public Python | [python-types.md](docs/reference/python-types.md) |
