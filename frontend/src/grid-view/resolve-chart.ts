/** Semantic chart resolver — mirror of grid_view_spec.render.charts.resolve_chart_data. */

import type { ChartOverlayDict, RowDict } from "../types/chart-bind";

const PALETTE = ["#22c55e", "#f59e0b", "#ef4444"] as const;

export interface ChartSeriesPointDict {
  name: string;
  values: number[];
  color?: string | null;
}

export interface ChartSliceDict {
  label: string;
  value: number;
  color?: string | null;
}

export interface ResolvedChartData {
  chartType: string;
  categories: string[];
  series: ChartSeriesPointDict[];
  slices: ChartSliceDict[];
  overlay?: ChartOverlayDict | null;
}

export interface ChartSpecFixture {
  id: string;
  chart_type: string;
  x_key?: string;
  label_key?: string;
  value_key?: string;
  group_by?: string;
  aggregate?: string;
  stacked?: boolean;
  tooltip_kind?: string;
  series?: Array<{
    key: string;
    label?: string;
    color?: string;
    series_type?: string;
  }>;
  overlay?: ChartOverlayDict;
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(String(value).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function paletteColor(index: number): string {
  return PALETTE[index % PALETTE.length] ?? PALETTE[0];
}

function aggregateGrouped(
  rows: RowDict[],
  groupBy: string,
  valueKey: string,
  aggregate: string,
): Array<{ label: string; value: number }> {
  const buckets = new Map<string, number[]>();
  for (const row of rows) {
    const label = String(row[groupBy] ?? "");
    const parsed = parseNumber(row[valueKey]);
    if (parsed === null) continue;
    const bucket = buckets.get(label) ?? [];
    bucket.push(parsed);
    buckets.set(label, bucket);
  }
  const result: Array<{ label: string; value: number }> = [];
  for (const [label, values] of buckets.entries()) {
    let value = 0;
    if (aggregate === "count") value = values.length;
    else if (aggregate === "avg") value = values.reduce((a, b) => a + b, 0) / values.length;
    else if (aggregate === "min") value = Math.min(...values);
    else if (aggregate === "max") value = Math.max(...values);
    else value = values.reduce((a, b) => a + b, 0);
    result.push({ label, value });
  }
  return result;
}

function resolvePieOrDonut(
  spec: ChartSpecFixture,
  rows: RowDict[],
): ResolvedChartData {
  const labelKey = spec.label_key ?? "label";
  const valueKey = spec.value_key ?? "value";
  const slices: ChartSliceDict[] = [];
  let sliceIndex = 0;
  for (const row of rows) {
    const parsed = parseNumber(row[valueKey]);
    const value = parsed === null ? 0 : parsed;
    if (value <= 0) continue;
    const rawColor = row.color;
    const color =
      typeof rawColor === "string" && rawColor ? rawColor : paletteColor(sliceIndex);
    slices.push({ label: String(row[labelKey] ?? ""), value, color });
    sliceIndex += 1;
  }
  return {
    chartType: spec.chart_type,
    categories: [],
    series: [],
    slices,
    overlay: spec.overlay ?? null,
  };
}

function resolveSeriesChart(
  spec: ChartSpecFixture,
  rows: RowDict[],
): ResolvedChartData {
  const categoryKey = spec.x_key ?? "label";
  const categories = rows.map((row) => String(row[categoryKey] ?? ""));
  const series = (spec.series ?? []).map((seriesSpec) => {
    const values = rows.map((row) => {
      if (spec.tooltip_kind === "packages" && seriesSpec.key === "included" && row._loss_mode) {
        return 0;
      }
      const parsed = parseNumber(row[seriesSpec.key]);
      return parsed === null ? 0 : parsed;
    });
    return {
      name: seriesSpec.label ?? seriesSpec.key,
      values,
      color: seriesSpec.color ?? null,
    };
  });
  return {
    chartType: spec.chart_type,
    categories,
    series,
    slices: [],
    overlay: spec.overlay ?? null,
  };
}

function resolveGroupedChart(
  spec: ChartSpecFixture,
  rows: RowDict[],
): ResolvedChartData {
  const groupBy = spec.group_by ?? "label";
  const valueKey = spec.value_key ?? "value";
  const aggregate = spec.aggregate ?? "sum";
  const aggregated = aggregateGrouped(rows, groupBy, valueKey, aggregate);
  return {
    chartType: spec.chart_type,
    categories: aggregated.map((row) => row.label),
    series: [
      {
        name: valueKey,
        values: aggregated.map((row) => row.value),
        color: null,
      },
    ],
    slices: [],
    overlay: spec.overlay ?? null,
  };
}

function resolveSimpleValueChart(
  spec: ChartSpecFixture,
  rows: RowDict[],
): ResolvedChartData {
  const categoryKey = spec.x_key ?? "label";
  const valueKey = spec.value_key ?? "value";
  const categories = rows.map((row) => String(row[categoryKey] ?? ""));
  const values = rows.map((row) => {
    const parsed = parseNumber(row[valueKey]);
    return parsed === null ? 0 : parsed;
  });
  return {
    chartType: spec.chart_type,
    categories,
    series: [{ name: valueKey, values, color: null }],
    slices: [],
    overlay: spec.overlay ?? null,
  };
}

export function resolveChartData(
  spec: ChartSpecFixture,
  rows: RowDict[],
): ResolvedChartData {
  if (spec.chart_type === "pie" || spec.chart_type === "donut") {
    return resolvePieOrDonut(spec, rows);
  }
  if (spec.series?.length) {
    return resolveSeriesChart(spec, rows);
  }
  if (spec.group_by) {
    return resolveGroupedChart(spec, rows);
  }
  return resolveSimpleValueChart(spec, rows);
}

/** Resolve wire ``ChartRuntimeDict`` + rows (same path as Python ``resolve_chart_data``). */
export function resolveChartDataFromRuntime(
  config: {
    id?: string;
    chartType?: string;
    bind?: {
      labelKey?: string;
      valueKey?: string;
      xKey?: string | null;
      groupBy?: string;
      aggregate?: string;
      stacked?: boolean;
      tooltipKind?: string;
      series?: Array<{
        key?: string;
        label?: string;
        color?: string;
        seriesType?: string;
      }>;
      rows?: RowDict[];
    };
    overlay?: ChartOverlayDict;
  },
  rows: RowDict[],
): ResolvedChartData {
  const bind = config.bind ?? {};
  const spec: ChartSpecFixture = {
    id: config.id ?? "chart",
    chart_type: config.chartType ?? "bar",
    x_key: bind.xKey ?? undefined,
    label_key: bind.labelKey,
    value_key: bind.valueKey,
    group_by: bind.groupBy,
    aggregate: bind.aggregate,
    stacked: bind.stacked,
    tooltip_kind: bind.tooltipKind,
    overlay: config.overlay,
    series: (bind.series ?? []).map((seriesDef) => ({
      key: seriesDef.key ?? "",
      label: seriesDef.label,
      color: seriesDef.color,
      series_type: seriesDef.seriesType,
    })),
  };
  const dataRows = bind.rows ?? rows;
  return resolveChartData(spec, dataRows);
}
