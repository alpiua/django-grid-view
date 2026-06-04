import { num, uiLocale } from "./charts";
import type { KpiSpecDict, ResolvedKpiDict, RowDict } from "./types";

export function formatKpiValue(value, fmt) {
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
    return n.toLocaleString(uiLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return String(value);
}
export function aggregateKpi(spec, rows) {
  var agg = spec.aggregate || "count";
  var key = spec.columnKey || spec.column_key;
  if (agg === "count") return rows.length;
  var nums = [];
  rows.forEach(function (row) {
    var parsed = num(row[key]);
    if (parsed !== null) nums.push(parsed);
  });
  if (agg === "sum") return nums.reduce(function (a, b) { return a + b; }, 0);
  if (agg === "avg") return nums.length ? nums.reduce(function (a, b) { return a + b; }, 0) / nums.length : 0;
  if (agg === "min") return nums.length ? Math.min.apply(null, nums) : 0;
  if (agg === "max") return nums.length ? Math.max.apply(null, nums) : 0;
  return 0;
}
export function resolveKpis(specs, rows) {
  return (specs || []).map(function (spec) {
    var raw = aggregateKpi(spec, rows);
    return {
      label: spec.label || "",
      valueFmt: formatKpiValue(raw, spec.format),
      rawValue: raw,
      tone: spec.tone || "default",
      icon: spec.icon || null
    };
  });
}
export function kpiCardHtml(kpi) {
  var icon = kpi.icon || "\uD83D\uDCCA";
  var label = kpi.label || "";
  var value = kpi.valueFmt || kpi.value_fmt || "";
  return (
    '<span class="cm-kpi-icon" aria-hidden="true">' + icon + "</span>" +
    '<div class="cm-kpi-body">' +
    '<span class="cm-kpi-label">' + label + "</span>" +
    '<span class="cm-kpi-value">' + value + "</span>" +
    "</div>"
  );
}
export function initKpiStrip(root, kpis, columns) {
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
export function initAllKpi(scope) {
  const root = scope || document;
  root.querySelectorAll("[data-cm-kpi-config]").forEach((node) => {
    if (node.dataset.cmKpiReady) return;
    const kpis = JSON.parse(node.dataset.cmKpiConfig || "[]");
    const columns = parseInt(node.dataset.cmKpiColumns || "4", 10);
    initKpiStrip(node, kpis, columns);
    node.dataset.cmKpiReady = "1";
  });
}
export const Kpi = { initKpiStrip, initAllKpi, kpiCardHtml };
