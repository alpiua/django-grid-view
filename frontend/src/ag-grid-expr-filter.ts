import { installAgGridExprFilter } from "./ag-grid/expr-filter";

const gv = (window.GridView = window.GridView || {});
installAgGridExprFilter(gv);
