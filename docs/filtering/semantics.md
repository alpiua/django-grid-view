# Filter semantics

Search and column filters use one matching contract across Simple Table, AG-Grid, exports, and the
browser. The same query string should produce the same visible rows on every surface.

## Search profiles

Each column declares how its filter popover behaves via `Column.column_filter`:

| Value | Use for | Syntax |
|-------|---------|--------|
| `default` | General text or value columns | text, phrases, smart combiners, numeric expressions, wildcards |
| `text` | Text-only columns | text, phrases, smart combiners, wildcards |
| `numeric` | Numeric columns | comparisons, ranges, wildcards |
| `list` | Checklist columns | set/list model plus expression support |
| `nosearch` | Actions, buttons, service columns | no filter UI; excluded from toolbar search |

Toolbar search uses the `toolbar` profile (same smart syntax as `default`, plus `label:term` scoping).

Aliases such as `column_text`, `set`, and `none` still work; new code should use the values above.

## Filter channels

| Channel | Request param | UI | Scope |
|---------|---------------|-----|-------|
| Toolbar search | `q` | Toolbar or table search input | Row haystack across visible searchable columns |
| Column expression | `col_q` (string per key) | Header popover | One column |
| Column list | `col_q` (set/list model) | Header checklist | One column |
| AG-Grid set filter | `filters` | SmartFilter checklist | One column |

FilterBar parameters such as `period` or `department` are **page-level** filters. Apply them in the
host loader before rows, KPIs, charts, and exports are built.

## Application order

Apply filters in this order on server and client:

1. Page-level FilterBar / queryset parameters  
2. Column `col_q` filters (AND across columns)  
3. Toolbar `q` on the row haystack  
4. AG-Grid set filters from `filters` (AND across columns)  

Simple Table client code applies `col_q` then `q`. Server export uses the same order through
`filter_table_for_request()` and `resolve_simple_table_for_export()`.

## Toolbar search (`q`)

Smart syntax:

| Syntax | Meaning |
|--------|---------|
| `alpha,beta` | OR groups (`/` and `\` also accepted outside quotes) |
| `alpha+beta` | AND inside one group |
| `-term` | Exclude term |
| `"literal phrase"` | Quoted literal |
| `>10`, `<=20`, `10..20` | Numeric comparison or inclusive range |
| `%fin%`, `oper%`, `%ions` | Contains, prefix, suffix wildcard |

Column scope is toolbar-only: `лікарів:10..20` limits that term to columns whose label matches.
Column popovers do not use `:` scoping because they are already bound to one column key.

## Column filters (`col_q`)

`col_q` is a JSON object keyed by column key. Values are expression strings or set/list models:

```text
col_q={"amount": ">1000", "name": "%Alpha%", "status": {"values": ["Open"]}}
```

Expression strings use the same parser as toolbar search, but the haystack is one cell.

## Set/list model

Shared by Simple Table list columns and AG-Grid SmartFilter:

```json
null
{"mode": "empty"}
{"mode": "non_empty"}
{"values": ["Alpha", "Beta"]}
{"values": ["Alpha"], "match": "any_token"}
```

| Model | Matches |
|-------|---------|
| `null` / missing | Filter inactive |
| `{"mode": "empty"}` | Blank, dash, or null cells |
| `{"mode": "non_empty"}` | Non-empty cells |
| `{"values": [...]}` | Selected values (`exact` or `any_token` per column) |

Use `Column(filter_match="any_token")` when a cell holds multiple space-separated tokens.

## Export parity

PDF, XLSX, and server-rendered tables should replay the same GET parameters: FilterBar params,
`q`, `col_q`, and `export_cols` for column visibility.

For Simple Table: `filter_table_for_request()` or `resolve_simple_table_for_export()`.
For flat artifacts: `resolve_artifact_table_for_export()`.

## Related

- [Server filtering](server.md) — host queryset integration  
- [Faceted filtering](facets.md) — option counts that stay in sync with every active filter
- [Page export pattern](../export/page-pattern.md) — one loader for page and export  
- [Simple table](../tables/simple-table.md) — column filter UI on v2 tables

## Conformance

Python and TypeScript implementations share JSON fixtures under `tests/fixtures/`. When behaviour
changes, update both sides and run `tests/test_filter_conformance.py` and
`npm run test:conformance` in `frontend/`.
