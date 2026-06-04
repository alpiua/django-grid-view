"use strict";
(function() {
  function bootGrid(root) {
    if (!root) return;
    function tryInit() {
      if (window.GridView && (typeof window.echarts !== "undefined" || !root.querySelector("[data-cm-chart-config]"))) {
        window.GridView.init({ root });
        return;
      }
      setTimeout(tryInit, 50);
    }
    tryInit();
  }
  function bootScope(scope) {
    var scopeEl = scope && scope.querySelector ? scope : document;
    scopeEl.querySelectorAll("[data-cm-grid-artifact-boot]").forEach(function(root) {
      if (root.dataset.cmGridArtifactBooted) return;
      root.dataset.cmGridArtifactBooted = "1";
      bootGrid(root);
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function() {
      bootScope(document);
    });
  } else {
    bootScope(document);
  }
  document.body.addEventListener("htmx:afterSwap", function(evt) {
    var target = evt.detail && evt.detail.target;
    if (!target) return;
    if (target.matches && target.matches("[data-cm-grid-artifact-boot]")) {
      delete target.dataset.cmGridArtifactBooted;
      bootGrid(target);
      return;
    }
    bootScope(target);
  });
})();
