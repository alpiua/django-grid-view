"use strict";
(function() {
  function bootCharts(scope) {
    var target = scope || document;
    function tryInit() {
      if (window.GridView && typeof window.echarts !== "undefined") {
        window.GridView.initAllCharts(target);
        return;
      }
      setTimeout(function() {
        tryInit();
      }, 50);
    }
    tryInit();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function() {
      bootCharts(document);
    });
  } else {
    bootCharts(document);
  }
  document.body.addEventListener("htmx:afterSwap", function(evt) {
    bootCharts(evt.detail && evt.detail.target ? evt.detail.target : document);
  });
})();
