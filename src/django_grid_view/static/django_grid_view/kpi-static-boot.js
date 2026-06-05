"use strict";
(function() {
  function bootKpi(scope) {
    if (window.GridView) window.GridView.initAllKpi(scope || document);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function() {
      bootKpi(document);
    });
  } else {
    bootKpi(document);
  }
  document.body.addEventListener("htmx:afterSwap", function(evt) {
    bootKpi(evt.detail && evt.detail.target ? evt.detail.target : document);
  });
})();
