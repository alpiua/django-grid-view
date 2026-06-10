/**
 * GridViewSpec runtime — canonical boot entry (Phase 7).
 *
 * Public API: GridView.boot(root) and GridView.bootScope(scope).
 * Page boot runs from js.html after all bundles parse; HTMX from installRuntimeBoot.
 */
import { bootstrapGridView, createGridView } from "./grid-view/create-grid-view";
import { installRuntimeBoot } from "./runtime/boot";
import { installAssetLoader } from "./runtime/asset-loader";
import "./runtime/settings";

export { bootstrapGridView, createGridView };

const gridView = bootstrapGridView();
installAssetLoader(gridView);
installRuntimeBoot(gridView);
