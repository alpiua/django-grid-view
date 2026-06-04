import esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await esbuild.build({
  entryPoints: [path.join(__dirname, "chart-conformance-entry.ts")],
  outfile: path.join(__dirname, "dist/chart-conformance.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: ["node18"],
  legalComments: "none",
});

console.log("Built chart conformance bundle → frontend/scripts/dist/chart-conformance.mjs");
