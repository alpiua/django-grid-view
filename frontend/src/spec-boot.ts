/**
 * GridViewSpec runtime — canonical boot entry (Phase 7).
 *
 * Public API: GridView.boot(root) and GridView.bootScope(scope).
 * Legacy per-artifact boot scripts are internalized in runtime/boot.ts.
 */
import { bootstrapGridView, createGridView } from "./grid-view/create-grid-view";
import { installRuntimeBoot } from "./runtime/boot";
import "./runtime/settings";

export { bootstrapGridView, createGridView };

const gridView = bootstrapGridView();
installRuntimeBoot(gridView);
