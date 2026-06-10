/** Mirror of grid_view_spec.types.chart_bind (maintainer contract). */

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

export type YAxisValueFormat = "number" | "percent" | "symbol";

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
  /** Value-axis label format: number (default), percent, or symbol (+ yAxisSymbol). */
  yAxisFormat?: YAxisValueFormat;
  /** Appended when yAxisFormat is symbol — host-defined, e.g. " ₴". */
  yAxisSymbol?: string;
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
