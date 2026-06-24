/**
 * Public import surface for the schema-generated GridViewSpec types.
 *
 * The types under ./generated are produced from schema/grid-view-spec.v2.json
 * (single source of truth) by `npm run gen:types` and kept in sync by the
 * gen:types:check gate (see scripts/ci-gate.sh + tests/test_ts_schema_parity.py).
 * Import wire/authoring shapes from here rather than reaching into ./generated.
 */
export * from "./generated/grid-view-spec";
// The generator names the root interface GridViewSpecV2; expose it under the
// canonical name used across the codebase and docs.
export type { GridViewSpecV2 as GridViewSpec } from "./generated/grid-view-spec";
