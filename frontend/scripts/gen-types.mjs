// Generate TypeScript types from the GridViewSpec JSON schema (single source of
// truth: schema/grid-view-spec.v2.json). Run via `npm run gen:types`.
//
// `--check` mode regenerates into a temp buffer and fails if it differs from the
// committed output — wire this into CI so the types can never drift from the
// schema (see tests/test_ts_schema_parity.py and frontend gen:types:check).
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { compile } from "json-schema-to-typescript";

const here = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = resolve(here, "../../schema/grid-view-spec.v2.json");
const OUT_PATH = resolve(here, "../src/types/generated/grid-view-spec.ts");

const BANNER = `/**
 * AUTO-GENERATED from schema/grid-view-spec.v2.json — DO NOT EDIT BY HAND.
 * Regenerate with: cd frontend && npm run gen:types
 * Drift is guarded by frontend gen:types:check + tests/test_ts_schema_parity.py.
 */`;

async function generate() {
  const schema = JSON.parse(await readFile(SCHEMA_PATH, "utf8"));
  return compile(schema, "GridViewSpec", {
    bannerComment: BANNER,
    additionalProperties: false,
    declareExternallyReferenced: true,
    enableConstEnums: false,
    style: { singleQuote: false, semi: true },
  });
}

const ts = await generate();
if (process.argv.includes("--check")) {
  const current = await readFile(OUT_PATH, "utf8").catch(() => "");
  if (current.trim() !== ts.trim()) {
    console.error(
      "[gen-types] Generated types are stale. Run `npm run gen:types` and commit src/types/generated/grid-view-spec.ts."
    );
    process.exit(1);
  }
  console.log("[gen-types] up to date.");
} else {
  await writeFile(OUT_PATH, ts);
  console.log(`[gen-types] wrote ${OUT_PATH}`);
}
