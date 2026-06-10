/** Conditional AG Grid CDN loader — URL from ``grid_view_spec_assets`` inline boot config. */
(function () {
  const w = window;
  const cdn = w.__djangoGridViewCdn ?? {};
  const defaultUrl =
    "https://cdn.jsdelivr.net/npm/ag-grid-community@31.3.4/dist/ag-grid-community.min.js";
  const src = cdn.agGridUrl ?? defaultUrl;

  function loadScript(url: string, checkFn: () => boolean): void {
    if (checkFn()) return;
    const script = document.createElement("script");
    script.src = url;
    script.async = false;
    document.head.appendChild(script);
  }

  loadScript(src, () => typeof w.agGrid !== "undefined");
})();
