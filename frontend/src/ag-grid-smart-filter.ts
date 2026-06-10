import { installAgGridSmartFilter } from "./ag-grid/smart-filter";

const gv = (window.GridView = window.GridView || {});
installAgGridSmartFilter(gv);
