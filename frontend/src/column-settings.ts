/** Column settings — bundled inside grid-view.min.js via runtime/settings.ts (Phase 7). */
import { installColumnSettings } from "./column-settings/install";

const gv = (window.GridView = window.GridView || {});
installColumnSettings(gv);
