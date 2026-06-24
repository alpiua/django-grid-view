import { installAgGridSmartFilter } from "./ag-grid/smart-filter";
import { i18n } from "./grid-view/i18n";

const gv = (window.GridView = window.GridView || {});
// Init i18n from host-provided catalog so filter labels are localized
if (window.GridViewI18n) {
  i18n.initI18n(window.GridViewI18n);
}
installAgGridSmartFilter(gv);
