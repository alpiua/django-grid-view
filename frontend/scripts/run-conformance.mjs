import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { matchColumnFilter, matchSetFilter, matchSmartHaystack, resolveKpis } from "./dist/conformance-search.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixturesDir = path.join(repoRoot, "tests/fixtures");

function load(name) {
  return JSON.parse(readFileSync(path.join(fixturesDir, name), "utf8"));
}

let failures = 0;

for (const case_ of load("filter_conformance.json")) {
  const got = matchColumnFilter(case_.cell, case_.query);
  if (got !== case_.expect) {
    console.error(
      `filter ${case_.id}: cell=${JSON.stringify(case_.cell)} query=${JSON.stringify(case_.query)} expected ${case_.expect} got ${got}`
    );
    failures += 1;
  }
}

function smartHaystackOptions(case_) {
  const options = {};
  if (Array.isArray(case_.cells)) options.cells = case_.cells;
  if (case_.cells_by_key && typeof case_.cells_by_key === "object") {
    options.cellsByKey = case_.cells_by_key;
    if (!options.cells) options.cells = Object.values(case_.cells_by_key);
  }
  if (Array.isArray(case_.columns)) options.columns = case_.columns;
  return Object.keys(options).length ? options : undefined;
}

for (const case_ of load("smart_search_conformance.json")) {
  const options = smartHaystackOptions(case_);
  const cells = options?.cells;
  const haystack = case_.haystack ?? (cells ? cells.join(" ") : "");
  const got = options
    ? matchSmartHaystack(haystack, case_.query, options)
    : matchSmartHaystack(haystack, case_.query);
  if (got !== case_.expect) {
    console.error(
      `smart ${case_.id}: haystack=${JSON.stringify(haystack)} query=${JSON.stringify(case_.query)} expected ${case_.expect} got ${got}`
    );
    failures += 1;
  }
}

for (const case_ of load("column_scope_conformance.json")) {
  const options = smartHaystackOptions(case_);
  const haystack = options?.cells ? options.cells.join(" ") : "";
  const got = matchSmartHaystack(haystack, case_.query, options);
  if (got !== case_.expect) {
    console.error(
      `scope ${case_.id}: query=${JSON.stringify(case_.query)} expected ${case_.expect} got ${got}`
    );
    failures += 1;
  }
}

for (const case_ of load("set_filter_conformance.json")) {
  const got = matchSetFilter(case_.cell, case_.model, {
    tokens: Array.isArray(case_.tokens) ? case_.tokens : undefined,
  });
  if (got !== case_.expect) {
    console.error(
      `set ${case_.id}: cell=${JSON.stringify(case_.cell)} model=${JSON.stringify(case_.model)} expected ${case_.expect} got ${got}`
    );
    failures += 1;
  }
}

const EPS = 1e-9;
for (const case_ of load("kpi_conformance.json")) {
  const got = resolveKpis(case_.specs, case_.rows);
  if (got.length !== case_.expect.length) {
    console.error(`kpi ${case_.id}: length expected ${case_.expect.length} got ${got.length}`);
    failures += 1;
    continue;
  }
  for (let i = 0; i < case_.expect.length; i += 1) {
    const g = got[i];
    const e = case_.expect[i];
    if (g.label !== e.label) {
      console.error(`kpi ${case_.id}[${i}]: label expected ${e.label} got ${g.label}`);
      failures += 1;
    }
    const raw = g.rawValue ?? g.raw_value;
    if (Math.abs(raw - e.rawValue) > EPS) {
      console.error(`kpi ${case_.id}[${i}]: rawValue expected ${e.rawValue} got ${raw}`);
      failures += 1;
    }
    const tone = g.tone || "default";
    if (tone !== (e.tone || "default")) {
      console.error(`kpi ${case_.id}[${i}]: tone expected ${e.tone} got ${tone}`);
      failures += 1;
    }
  }
}

if (failures) {
  console.error(`${failures} conformance case(s) failed`);
  process.exit(1);
}

console.log("JS conformance: filter + smart_search + column_scope + set_filter + kpi fixtures passed");
