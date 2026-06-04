import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveChartData } from "./dist/chart-conformance.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixturePath = path.join(repoRoot, "tests/fixtures/chart_resolve_conformance.json");
const cases = JSON.parse(readFileSync(fixturePath, "utf8"));

const EPS = 1e-9;

function assertEqual(got, expect, caseId) {
  if (got.chartType !== expect.chartType) {
    throw new Error(`${caseId}: chartType expected ${expect.chartType} got ${got.chartType}`);
  }
  if (JSON.stringify(got.categories) !== JSON.stringify(expect.categories)) {
    throw new Error(`${caseId}: categories mismatch`);
  }
  if (JSON.stringify(got.overlay ?? null) !== JSON.stringify(expect.overlay ?? null)) {
    throw new Error(`${caseId}: overlay mismatch`);
  }
  if ((got.series?.length ?? 0) !== (expect.series?.length ?? 0)) {
    throw new Error(`${caseId}: series length mismatch`);
  }
  for (let i = 0; i < (expect.series?.length ?? 0); i += 1) {
    const g = got.series[i];
    const e = expect.series[i];
    if (g.name !== e.name) throw new Error(`${caseId}: series[${i}].name mismatch`);
    if ((g.color ?? null) !== (e.color ?? null)) {
      throw new Error(`${caseId}: series[${i}].color mismatch`);
    }
    if (g.values.length !== e.values.length) {
      throw new Error(`${caseId}: series[${i}].values length mismatch`);
    }
    for (let j = 0; j < e.values.length; j += 1) {
      if (Math.abs(g.values[j] - e.values[j]) > EPS) {
        throw new Error(`${caseId}: series[${i}].values[${j}] expected ${e.values[j]} got ${g.values[j]}`);
      }
    }
  }
  if ((got.slices?.length ?? 0) !== (expect.slices?.length ?? 0)) {
    throw new Error(`${caseId}: slices length mismatch`);
  }
  for (let i = 0; i < (expect.slices?.length ?? 0); i += 1) {
    const g = got.slices[i];
    const e = expect.slices[i];
    if (g.label !== e.label) throw new Error(`${caseId}: slices[${i}].label mismatch`);
    if (Math.abs(g.value - e.value) > EPS) {
      throw new Error(`${caseId}: slices[${i}].value expected ${e.value} got ${g.value}`);
    }
    if (e.color != null && g.color !== e.color) {
      throw new Error(`${caseId}: slices[${i}].color mismatch`);
    }
  }
}

let failures = 0;
for (const case_ of cases) {
  try {
    const got = resolveChartData(case_.spec, case_.rows);
    assertEqual(got, case_.expect, case_.id);
  } catch (err) {
    console.error(String(err));
    failures += 1;
  }
}

if (failures) {
  console.error(`${failures} chart conformance case(s) failed`);
  process.exit(1);
}

console.log(`JS chart conformance: all ${cases.length} fixtures passed`);
