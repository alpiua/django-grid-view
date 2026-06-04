/** Mirror of django_grid_view.types.chart_bind (maintainer contract). */

export interface ChartOverlayDict {
  title: string;
  value: string;
  tone: string;
}

export interface SeriesBindDict {
  key?: string;
  label?: string;
  color?: string;
  seriesType?: string;
}

export type RowDict = Record<string, string | number | boolean | null>;

export interface ChartBindDict {
  labelKey?: string;
  valueKey?: string;
  pieVariant?: string;
  xKey?: string | null;
  series?: SeriesBindDict[];
  rows?: RowDict[];
  orientation?: string;
  stacked?: boolean;
  tooltipKind?: string;
  groupBy?: string;
  aggregate?: string;
}

export interface ChartRuntimeDict {
  id?: string;
  chartType?: string;
  height?: number;
  dataSource?: string;
  bind?: ChartBindDict;
  overlay?: ChartOverlayDict;
  echartsTheme?: string;
}
