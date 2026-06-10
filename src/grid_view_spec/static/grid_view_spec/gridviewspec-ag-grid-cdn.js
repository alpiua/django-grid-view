"use strict";
(function() {
  var _a, _b;
  const w = window;
  const cdn = (_a = w.__djangoGridViewCdn) != null ? _a : {};
  const defaultUrl = "https://cdn.jsdelivr.net/npm/ag-grid-community@31.3.4/dist/ag-grid-community.min.js";
  const src = (_b = cdn.agGridUrl) != null ? _b : defaultUrl;
  function loadScript(url, checkFn) {
    if (checkFn()) return;
    const script = document.createElement("script");
    script.src = url;
    script.async = false;
    document.head.appendChild(script);
  }
  loadScript(src, () => typeof w.agGrid !== "undefined");
})();
