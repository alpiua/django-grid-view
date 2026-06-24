import { num, uiLocale } from "./format";
import type { KpiSpecDict, ResolvedKpiDict, RowDict } from "./types";

interface KpiCardInput extends ResolvedKpiDict {
  value_fmt?: string;
}

export function formatKpiValue(
  value: number | string,
  fmt: string | undefined,
): string {
  var n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  fmt = fmt || "number";
  if (fmt === "currency") {
    return n.toLocaleString(uiLocale(), { maximumFractionDigits: 0 });
  }
  if (fmt === "percent") {
    return n.toFixed(1) + "%";
  }
  if (fmt === "number") {
    if (Math.abs(n - Math.round(n)) < 1e-9) {
      return Math.round(n).toLocaleString(uiLocale());
    }
    return n.toLocaleString(uiLocale(), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return String(value);
}
export function aggregateKpi(spec: KpiSpecDict, rows: RowDict[]): number {
  const agg = spec.aggregate || "count";
  if (agg === "count") return rows.length;
  const key = spec.columnKey ?? spec.column_key ?? spec.field;
  if (!key) return 0;
  const nums: number[] = [];
  rows.forEach((row) => {
    const parsed = num(row[key]);
    if (parsed !== null) nums.push(parsed);
  });
  if (agg === "sum")
    return nums.reduce(function (a, b) {
      return a + b;
    }, 0);
  if (agg === "avg")
    return nums.length
      ? nums.reduce(function (a, b) {
          return a + b;
        }, 0) / nums.length
      : 0;
  if (agg === "min") return nums.length ? Math.min.apply(null, nums) : 0;
  if (agg === "max") return nums.length ? Math.max.apply(null, nums) : 0;
  return 0;
}
export function resolveKpis(
  specs: KpiSpecDict[],
  rows: RowDict[],
): ResolvedKpiDict[] {
  return (specs || []).map(function (spec) {
    var raw = aggregateKpi(spec, rows);
    return {
      label: spec.label || "",
      valueFmt: formatKpiValue(raw, spec.format),
      rawValue: raw,
      tone: spec.tone || "default",
      icon: spec.icon || undefined,
    };
  });
}
export function kpiCardHtml(kpi: KpiCardInput): string {
  var icon = kpi.icon || "\uD83D\uDCCA";
  var label = kpi.label || "";
  var value = kpi.valueFmt || kpi.value_fmt || "";
  return (
    '<span class="cm-kpi-icon" aria-hidden="true">' +
    icon +
    "</span>" +
    '<div class="cm-kpi-body">' +
    '<span class="cm-kpi-label">' +
    label +
    "</span>" +
    '<span class="cm-kpi-value">' +
    value +
    "</span>" +
    "</div>"
  );
}
export function initKpiStrip(
  root: Element,
  kpis: ResolvedKpiDict[],
  columns: number | undefined,
): void {
  if (!root || !kpis?.length) return;
  root.innerHTML = "";
  root.className = `cm-kpi-grid cm-kpi-cols-${columns || 4}`;
  kpis.forEach((kpi) => {
    const card = document.createElement("div");
    card.className = `cm-kpi-card cm-kpi-tone-${kpi.tone || "default"}`;
    card.innerHTML = kpiCardHtml(kpi);
    root.appendChild(card);
  });
}
export function initAllKpi(scope?: Document | Element): void {
  const root: Document | Element = scope || document;
  root.querySelectorAll("[data-cm-kpi-config]").forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    if (node.dataset.cmKpiReady) return;
    const kpis: ResolvedKpiDict[] = JSON.parse(
      node.dataset.cmKpiConfig || "[]",
    );
    const columns = parseInt(node.dataset.cmKpiColumns || "4", 10);
    initKpiStrip(node, kpis, columns);
    node.dataset.cmKpiReady = "1";
  });
}
export const Kpi = { initKpiStrip, initAllKpi, kpiCardHtml };
