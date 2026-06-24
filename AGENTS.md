# grid-view-spec — Agent Instructions

## CRITICAL DIRECTIVE
**NEVER** `git commit`, `git push`, `git checkout <file>`, or `git restore` without explicit user approval.

## Orientation
- **Architecture (vNext)**: [docs/maintainers/gridviewspec-architecture.md](docs/maintainers/gridviewspec-architecture.md)
- **Package map**: `src/grid_view_spec/` (framework-agnostic core + optional Django backend at `backends/django/`)
- **Skill (docs)**: [.agents/skills/grid-view-spec-docs/SKILL.md](.agents/skills/grid-view-spec-docs/SKILL.md)
- **TDD workflow**: `contextunity/.agents/skills/tdd/SKILL.md` — Red → Green → Refactor for every behavior change
- **Code quality (canonical)**: `contextunity/docs/architecture/code-quality.md` — typing, modularization, tooling invariants (adapted below for this repo)

---

## Professional code — no hacks

Write production-grade code. **Hacks are forbidden** even if tests pass.

| Forbidden | Do instead |
|-----------|------------|
| `Any`, `cast`, `# type: ignore`, `# pyright: ignore` | Narrow with `isinstance`, `TypeGuard`, `Protocol`, `TypedDict`, `JsonValue` |
| `_ = host` / ignoring protocol parameters | Wire the parameter through the real code path |
| Runtime imports to break circular graphs without fixing the seam | Move the dependency; use lazy import only at a documented boundary (e.g. inside one function) |
| 200 OK with empty body when the request is invalid | Explicit 400/404 and clear error message |
| `inspect.getsource`, asserting on implementation strings | Assert observable behavior |
| “Fix pyright later” / merge with known pyright errors | Gate is zero errors on touched paths before completion |
| Generic `helpers.py` / `utils.py` | Domain-named modules (`export/rows.py`, `render/bind.py`) |
| Files > **400 lines** | Split immediately (see code-quality doc) |
| Workarounds that hide symptoms | Fix root cause; re-run full verification |

If a constraint seems to require a hack, **stop** and redesign the seam (or ask the user) — do not ship the shortcut.

---

## Strict static typing (basedpyright)

Config: `[tool.basedpyright]` in `pyproject.toml` — **`typeCheckingMode = "strict"`** on `src/grid_view_spec`, `tests`.

### Mandatory commands (same bar as CI / pre-commit)

```bash
uv run ruff check src/grid_view_spec tests
uv run basedpyright --warnings src/grid_view_spec tests
```

**`--warnings` is required** — warnings fail the hook; “0 errors” without `--warnings` is not sufficient.

### Non-negotiable typing rules

From `contextunity/docs/architecture/code-quality.md` §1, applied here:

- **Zero `Any`** at package and public API boundaries.
- **No escape hatches**: no `cast`, no `# type: ignore`.
- **Strong returns**: public functions return concrete types, `TypedDict`, dataclasses, or `Protocol` — not untyped `dict` at boundaries.
- **Narrow `object` / `JsonValue`**: `isinstance` / wire guards (`is_wire_mapping`, etc.) before subscript or attribute use.
- **`TYPE_CHECKING` imports** for heavy or circular types; never leave forward refs undefined for pyright (import under `TYPE_CHECKING` when quoted aliases need it).
- **`grid_view_spec` core** stays import-clean: no runtime `django.db` in module namespace (guard: `test_pipeline_module_has_no_runtime_django_bindings`).

### After typing or boundary changes

1. `basedpyright --warnings` on all edited paths  
2. Targeted pytest for the module  
3. Full `uv run pytest -q` before completion  

---

## TEMPORARY — Session discipline (remove after vNext migration stabilizes)

> Added after grid_view_spec render/export/lazy bug-fix session. **Do not mark work done until every gate below is green.**

### Why this exists
Large multi-file batches without per-step verification caused: circular imports, broken architecture tests, pyright drift, registry typos, and fragile tests. This section prevents repeating that.

### Mandatory loop (TDD + verification)

**One logical change at a time** (one bug, one module seam, or one registry path — not “all 7 bugs” in one pass).

| Phase | Action |
|-------|--------|
| **Red** | Write or extend a **behavior** test (not `inspect.getsource`, not string-matching implementation). Run: `uv run pytest tests/test_<area>.py -q` — confirm fail or gap. |
| **Green** | Minimal fix. Re-run the same test file. |
| **Refactor** | Clean up; re-run same tests. |
| **Gate A — lint + types** | `uv run ruff check <paths>` then `uv run basedpyright --warnings <paths>` |
| **Gate B — architecture guards** | `uv run pytest tests/test_gridviewspec_export.py::test_pipeline_module_has_no_runtime_django_bindings -q` when editing `grid_view_spec/export/` or cross-package imports |
| **Gate C — full suite** | `uv run pytest -q` before telling the user the task is complete |

**Never** report completion after only Gate A or only a subset of tests.

### Import & layer rules (grid_view_spec)

1. **`grid_view_spec/export/pipeline.py`** — no runtime Django imports in module namespace. Use `TYPE_CHECKING` + lazy import **inside** functions that need Django types at runtime.
2. **Export registry** — `register_pdf_export` / `register_xlsx_export`; views call `get_*_export_entry` + pipeline with `(host, DjangoExportContext)`.
3. **Host protocol** — render/export paths use `host.filter_state_from_request`, `DjangoExportContext.from_request`; do not discard `host` or `subject_id`.
4. **Typing** — see **Strict static typing** above; no exceptions for “quick fixes”.

### Test design (anti-patterns from this session)

| Do | Don't |
|----|--------|
| Assert HTTP status, row counts, connector (`Q.OR`), wire payload shape | `inspect.getsource` to prove delegation |
| Test missing `?page=` → 400, unknown `block_id` → 400 | Accept 200 with empty fragment body |
| Register builder in test → call view/export path | Assume registry wiring without integration test |

### Pre-merge checklist (copy mentally each session)

```
[ ] Red test written/updated for the behavior
[ ] Green: targeted pytest file passes
[ ] ruff check clean on edited paths
[ ] basedpyright --warnings clean on edited paths (strict, zero hacks)
[ ] test_pipeline_module_has_no_runtime_django_bindings (if export/import graph touched)
[ ] uv run pytest -q (full)
[ ] No circular import (collection error → fix graph, not stack hacks)
[ ] No hack listed in "Professional code — no hacks"
```

### When stuck
Same error **3 times** → stop, report traceback + attempts, ask user (ContextUnity verification workflow).

---

## Skill routing (this repo)

| Trigger | Action |
|---------|--------|
| Behavior change / bug fix | **TDD skill** (primary) + gates above |
| Typing / lint / boundary cleanup | `code-quality.md` + **Strict static typing** gates; `contextunity/.agents/skills/type-validation/SKILL.md` for toolchain order |
| Export / render / host seams | Architecture doc § export + render; export + render test modules |
| GridViewSpec MCP (migration) | **`grid-view-spec-mcp`** skill + [mcp-server.md](docs/tools/mcp-server.md) |
| Django views / HTMX lazy | `tests/test_gridviewspec_django_views.py` |
| Public API / types surface | [docs/reference/python-types.md](docs/reference/python-types.md) — import from package, do not copy shapes |

## Pytest markers

- **New code:** `import grid_view_spec`.
