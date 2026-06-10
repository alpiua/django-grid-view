import esbuild from "esbuild";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../src/grid_view_spec/static/grid_view_spec");

/** @typedef {{ id: string, source: string, bundle?: boolean, banner?: boolean }} ManifestBundle */
/** @typedef {{ id: string, source: string }} ManifestStylesheet */

const manifest = JSON.parse(readFileSync(path.join(__dirname, "asset-manifest.json"), "utf8"));
const bundles = /** @type {ManifestBundle[]} */ (manifest.bundles);
const stylesheets = /** @type {ManifestStylesheet[]} */ (manifest.stylesheets ?? []);

async function buildEntry(entry, minify) {
  const { id: name, source, bundle: isBundle = false, banner: withBanner = false } = entry;
  const suffix = minify ? ".min.js" : ".js";
  const banner = withBanner
    ? `/** grid-view-spec — built from frontend/${source} */\n`
    : undefined;

  await esbuild.build({
    entryPoints: [path.join(__dirname, source)],
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

for (const entry of bundles) {
  await buildEntry(entry, false);
  await buildEntry(entry, true);
}

async function buildCss(entry, minify) {
  const { id: name, source } = entry;
  const suffix = minify ? ".min.css" : ".css";
  await esbuild.build({
    entryPoints: [path.join(__dirname, source)],
    outfile: path.join(OUT_DIR, `${name}${suffix}`),
    bundle: true,
    minify,
    legalComments: "none",
  });
}

for (const entry of stylesheets) {
  await buildCss(entry, false);
  await buildCss(entry, true);
}

console.log(`Built ${bundles.length * 2} JS + ${stylesheets.length * 2} CSS files → ${OUT_DIR}`);
