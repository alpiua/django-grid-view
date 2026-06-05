import esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outdir = path.join(__dirname, "dist");

await esbuild.build({
  entryPoints: [path.join(__dirname, "conformance-entry.ts")],
  outfile: path.join(outdir, "conformance-search.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: ["node18"],
  legalComments: "none",
});

console.log("Built conformance bundle → frontend/scripts/dist/conformance-search.mjs");
