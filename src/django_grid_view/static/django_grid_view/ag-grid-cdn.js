"use strict";
(function() {
  var w = window;
  var cdn = w.__djangoGridViewCdn || {};
  var defaultUrl = "https://cdn.jsdelivr.net/npm/ag-grid-community@31.3.2/dist/ag-grid-community.min.js";
  var src = cdn.agGridUrl || defaultUrl;
  function loadScript(url, checkFn) {
    if (checkFn()) return;
    var s = document.createElement("script");
    s.src = url;
    s.async = false;
    document.head.appendChild(s);
  }
  loadScript(src, function() {
    return typeof agGrid !== "undefined";
  });
})();
