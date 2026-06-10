/** Pin AG-Grid community assets into package static/ (same files as npm, no transforms). */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, "../node_modules/ag-grid-community");
const outDir = path.resolve(
  __dirname,
  "../../src/grid_view_spec/static/grid_view_spec/vendor",
);

const files = [
  ["styles/ag-grid.css", "ag-grid.css"],
  ["styles/ag-theme-quartz.css", "ag-theme-quartz.css"],
  ["dist/ag-grid-community.min.js", "ag-grid-community.min.js"],
];

await fs.mkdir(outDir, { recursive: true });
for (const [relSrc, name] of files) {
  await fs.copyFile(path.join(pkgRoot, relSrc), path.join(outDir, name));
  console.log(`vendor ${name}`);
}
