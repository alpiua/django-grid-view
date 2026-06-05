# Filter Semantics Contract

This page defines how django-grid-view interprets search and filter input across
SimpleTable, AG-Grid, server exports, and client-side rendering. The goal is one
matching contract with different UI controls, not different behavior per surface.

## Source Of Truth

| Layer | Python | TypeScript |
|-------|--------|------------|
| Token/profile contract | `django_grid_view.search.contract` | `frontend/src/grid-view/search/contract.ts` |
| Match engine | `django_grid_view.search.engine` | `frontend/src/grid-view/search/filter-engine.ts` |
| Smart query parser | `django_grid_view.search.smart` | `frontend/src/grid-view/search/smart-query.ts` |
| Conformance | `tests/test_filter_conformance.py` | `npm run test:conformance` |

The shared fixtures live in:

- `tests/fixtures/filter_conformance.json`
- `tests/fixtures/smart_search_conformance.json`
- `tests/fixtures/column_scope_conformance.json`
- `tests/fixtures/set_filter_conformance.json`

When behavior changes, update the engine and the fixtures together. UI modules
must call the shared engine instead of reimplementing parser or matching rules.

## Search Profiles

`Column.column_filter` is the public wire field for SimpleTable columns:

| Value | Intended use | Enabled syntax |
|-------|--------------|----------------|
| `default` | General searchable text/value columns | text, phrases, smart combiners, numeric expressions, wildcards |
| `text` | Text-only columns | text, phrases, smart combiners, wildcards |
| `numeric` | Numeric columns | numeric expressions, ranges, wildcards, smart combiners |
| `list` | Checklist/list filter columns | set/list model plus default expression support |
| `nosearch` | Actions, buttons, service columns | no filter UI and excluded from toolbar search |

Legacy aliases such as `column_text`, `column_expr`, `set`, and `none` are accepted
for compatibility, but new host code should use the canonical values above.

Toolbar search uses the `toolbar` profile. It enables the same smart syntax as
`default` plus column scoping (`label:term`).

## Filter Channels

| Channel | Wire | UI | Scope |
|---------|------|----|-------|
| Toolbar search | `q` | Toolbar or table search input | Row haystack across visible searchable columns |
| Column expression filter | `col_q` string values | SimpleTable header popover | One column |
| Column list filter | `col_q` set/list model | SimpleTable header checklist | One column |
| AG-Grid set filter | `filters` set/list model | AG-Grid SmartFilter checklist | One column |

FilterBar page parameters such as `period` or `department_types` are outside this
engine. They are page-level server filters and should be applied before table
rows, KPIs, charts, and exports are built.

## Application Order

All server and client surfaces should apply filters in this order:

1. Page-level FilterBar/queryset parameters.
2. `col_q` column filters, AND across columns.
3. Toolbar `q` search on the row haystack.
4. AG-Grid set filters from `filters`, AND across columns.

SimpleTable client filtering applies `col_q` and then `q` in
`SimpleTable.applyAllFilters()`. Server-side SimpleTable export uses
`filter_table_for_request()`, which follows the same order. AG-Grid infinite
views apply host queryset filters first, then grid filter/search parameters.

## Toolbar Search (`q`)

Toolbar search operates on a row haystack built from visible, searchable columns.

Smart syntax:

| Syntax | Meaning |
|--------|---------|
| `alpha,beta` | OR groups. `/` and `\` are also accepted outside quotes. |
| `alpha+beta` | AND terms inside one group. |
| `-term` | Exclude term. Unicode dash variants are accepted at term boundaries. |
| `"literal phrase"` | Literal phrase. Operators inside quotes are treated as text. |
| `>10`, `<=20`, `10..20` | Numeric comparison or inclusive range. |
| `%fin%`, `oper%`, `%ions` | Contains, prefix, or suffix wildcard. |

Unquoted single-word terms are case-insensitive and space-insensitive. Unquoted
phrases with spaces are matched as literal substrings.

Column scope is toolbar-only. A term like `лікарів:10..20` limits that term to
visible columns whose label matches `лікарів` by case-insensitive,
space-insensitive substring. Scoped terms can be combined:

```text
лікарів:10..20+записів:>100+відділення:хірург -тер
```

If the label before `:` does not match a visible column, the term is treated as
plain text. Column popovers do not use `:` scoping because they are already bound
to one column key through `col_q`.

## Column Filters (`col_q`)

`col_q` is a JSON object keyed by column key. Each value is either a string
expression or a set/list model.

```text
col_q={"amount": ">1000", "name": "%Alpha%", "status": {"values": ["Open"]}}
```

Expression values use the same smart parser as toolbar search, but the haystack
is one cell instead of the whole row.

| Expression | Example | Behavior |
|------------|---------|----------|
| Numeric comparison | `>1000`, `<=50`, `=42` | Parses localized numbers with spaces or commas. |
| Numeric range | `10..20` | Inclusive lower/upper bounds. |
| Wildcard | `%fin%`, `oper%`, `%ions` | Contains, starts with, ends with. |
| Smart text | `north,west`, `alpha+-beta` | OR, AND, exclude, quoted phrases. |

`Column(column_filter="list")` renders a checklist panel in SimpleTable. The
selected state is serialized as a set/list model under the same `col_q` key.

## Set/List Model

The set/list model is shared by SimpleTable list columns and AG-Grid SmartFilter.

```json
null
{"mode": "empty"}
{"mode": "non_empty"}
{"values": ["Alpha", "Beta"]}
{"values": ["Alpha"], "match": "any_token"}
```

| Model | Behavior |
|-------|----------|
| `null` or missing | Filter inactive. |
| `{"mode": "empty"}` | Match blank, dash, null, or equivalent empty cells. |
| `{"mode": "non_empty"}` | Match cells with at least one non-empty token/value. |
| `{"values": [...]}` | Match selected values. Exact mode uses the whole cell; `any_token` mode matches individual cell tokens. |

Use `Column(filter_match="any_token")` when a list column stores multiple
space-separated values and selected checklist values should match individual
tokens. Keep the default `exact` mode when the rendered cell is a single logical
value.

## UI Ownership

| Module | Responsibility |
|--------|----------------|
| `column-filters.ts` | Popover lifecycle, positioning, URL updates, writing `th.dataset.cmColFilterValue`. |
| `set-filter-panel.ts` | Checklist UI state and set/list model serialization. |
| `simple-table.ts` | Row visibility, counters, grouped section visibility, footer recalculation. |
| `search/filter-engine.ts` | Matching behavior for expressions and set/list models. |
| `search/row-haystack.ts` | Client-side row haystack and column metadata. |

The popover and checklist modules should never decide whether a row matches.
They collect input and then delegate to `SimpleTable.applyAllFilters()` and the
shared filter engine.

## Server And Export Parity

Server-rendered tables, PDF export, and XLSX export should replay the same
request parameters:

- page-level FilterBar parameters,
- toolbar `q`,
- column `col_q`,
- column order/visibility via `export_cols`.

For SimpleTable rows, call `filter_table_for_request(rows, table, request)`. For
exports, use `resolve_simple_table_for_export()` or
`resolve_artifact_table_for_export()` so visible columns and filter state match
the browser.

## Adding A Filter Surface

1. Define the wire format using `q`, `col_q`, or `filters`.
2. Build a row haystack or one-cell value according to this contract.
3. Call the shared match engine.
4. Add conformance cases for any new syntax or model shape.
5. Sync export URLs with the same GET parameters.

## Related Docs

- [Server Filtering Contract](server-filtering-contract.md)
- [Host app page export](host-app-page-export.md)
