/** Charts runtime — loads after core ``grid-view`` and optional ECharts CDN. */
import { Charts } from "./grid-view/charts";
import { installChartsApi } from "./grid-view/charts-bridge";

installChartsApi(Charts);
