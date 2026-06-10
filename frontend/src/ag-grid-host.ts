import { installAgGridHost } from "./ag-grid/host";

const gv = (window.GridView = window.GridView || {});
installAgGridHost(gv);
