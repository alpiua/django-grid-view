import { matchAgGridQuickFilter } from "./grid-view/search/filter-engine";

(function () {
  var gv = (window.GridView = window.GridView || {});
  gv.AgGrid = gv.AgGrid || {};
  gv.AgGrid.matchQuickFilter = matchAgGridQuickFilter;

  gv.AgGrid.createAdvancedSearch = function (inputSelector) {
    if (inputSelector === void 0) inputSelector = "#ag-quick-filter";
    return function (_quickFilterParts, rowQuickFilterAggregateText) {
      const inputElement = document.querySelector(inputSelector);
      const searchExpr =
        inputElement instanceof HTMLInputElement ? inputElement.value : "";
      if (!searchExpr) return true;
      return matchAgGridQuickFilter(rowQuickFilterAggregateText, searchExpr);
    };
  };
})();
