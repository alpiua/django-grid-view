import esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../src/django_grid_view/static/django_grid_view");

/** Standalone IIFE modules — transpile TS → JS (and .min.js). Source of truth: frontend/src/. */
const ENTRIES = [
  "grid-view",
  "column-settings",
  "ag-grid-cdn",
  "ag-grid-host",
  "ag-grid-boot",
  "ag-grid-smart-filter",
  "ag-grid-advanced-search",
  "ag-grid-tooltip",
  "chart-static-boot",
  "grid-artifact-boot",
  "kpi-static-boot",
];

async function buildEntry(name, minify) {
  const suffix = minify ? ".min.js" : ".js";
  const banner =
    name === "grid-view" || name === "column-settings"
      ? `/** django-grid-view — built from frontend/src/${name === "grid-view" ? "grid-view/" : name}.ts */\n`
      : undefined;

  const isBundle = name === "grid-view";
  const entry =
    name === "grid-view"
      ? path.join(__dirname, "src/grid-view-entry.ts")
      : path.join(__dirname, "src", `${name}.ts`);

  await esbuild.build({
    entryPoints: [entry],
    outfile: path.join(OUT_DIR, `${name}${suffix}`),
    bundle: isBundle,
    format: isBundle ? "iife" : undefined,
    minify,
    banner: banner ? { js: banner } : undefined,
    target: ["es2018"],
    platform: "browser",
    legalComments: "none",
  });
}

for (const name of ENTRIES) {
  await buildEntry(name, false);
  await buildEntry(name, true);
}

async function buildCss(minify) {
  const suffix = minify ? ".min.css" : ".css";
  await esbuild.build({
    entryPoints: [path.join(__dirname, "styles/grid-view.css")],
    outfile: path.join(OUT_DIR, `grid-view${suffix}`),
    bundle: true,
    minify,
    legalComments: "none",
  });
}

await buildCss(false);
await buildCss(true);

console.log(`Built ${ENTRIES.length * 2} JS + 2 CSS files → ${OUT_DIR}`);
