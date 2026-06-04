"use strict";
(function() {
  var gv = window.GridView = window.GridView || {};
  gv.AgGrid = gv.AgGrid || {};
  gv.AgGrid.createAdvancedSearch = function(inputSelector) {
    if (inputSelector === void 0) inputSelector = "#ag-quick-filter";
    return function(quickFilterParts, rowQuickFilterAggregateText) {
      const inputElement = document.querySelector(inputSelector);
      const searchExpr = inputElement ? inputElement.value : "";
      if (!searchExpr) return true;
      const dataStr = String(rowQuickFilterAggregateText != null ? rowQuickFilterAggregateText : "").toLowerCase();
      const orGroups = searchExpr.toLowerCase().split(";").map(function(s) {
        return s.trim();
      }).filter(Boolean);
      if (orGroups.length === 0) return true;
      return orGroups.some(function(group) {
        const andTokens = group.split(",").map(function(s) {
          return s.trim();
        }).filter(Boolean);
        return andTokens.every(function(token) {
          const isNegative = token.startsWith("-");
          const raw = isNegative ? token.slice(1).trim() : token;
          if (!raw) return true;
          let matches = dataStr.includes(raw);
          if (!matches && raw.includes("-")) {
            const dataClean = dataStr.replace(/ /g, "");
            const rawClean = raw.replace(/-/g, "");
            matches = dataClean.includes(rawClean);
          }
          return isNegative ? !matches : matches;
        });
      });
    };
  };
})();
