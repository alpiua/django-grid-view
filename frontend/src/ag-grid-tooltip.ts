import { installAgGridTooltip } from "./ag-grid/tooltip";

const gv = (window.GridView = window.GridView || {});
installAgGridTooltip(gv);
