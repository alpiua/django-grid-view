(function () {
  var gv = (window.GridView = window.GridView || {});
  gv.AgGrid = gv.AgGrid || {};
  gv.AgGrid.Tooltip = class {
    init(params) {
      const eGui = document.createElement("div");
      eGui.className = "cm-ellipsis-tip cm-ellipsis-tip--floating";
      eGui.innerHTML = params.value ? params.value : "No data";
      this.eGui = eGui;
    }
    getGui() {
      return this.eGui;
    }
  };
})();
