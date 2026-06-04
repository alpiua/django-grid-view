(function () {
  var gv = (window.GridView = window.GridView || {});

  function parseBootConfig(node) {
    try {
      return JSON.parse(node.textContent || "{}");
    } catch (e) {
      console.error("[GridView.AgGrid] Invalid boot config JSON:", e);
      return null;
    }
  }

  function resolveGroupsOrder(raw) {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string" && raw) {
      return raw.split(",").map(function (s) {
        return s.trim();
      });
    }
    return [];
  }

  function resolvePresets(gridId, fromConfig) {
    if (fromConfig && typeof fromConfig === "object") return fromConfig;
    try {
      var ls = localStorage.getItem("agGridPresets_" + gridId);
      if (ls) return JSON.parse(ls);
    } catch (e) {}
    return {};
  }

  function resolveSearches(gridId, fromConfig) {
    if (Array.isArray(fromConfig)) return fromConfig;
    if (fromConfig) {
      try {
        var parsed = JSON.parse(String(fromConfig));
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    try {
      var ls = localStorage.getItem("cmSavedSearches_" + gridId);
      if (ls) return JSON.parse(ls);
    } catch (e) {}
    return [];
  }

  function bootFromConfig(config) {
    if (!config || !config.gridId) return;

    var gridId = config.gridId;
    var containerId = config.containerId || "defaultContainer";
    var optionsVar = config.optionsVar || "gridOptions";
    var groupsOrder = resolveGroupsOrder(config.groupsOrder);
    var presets = resolvePresets(gridId, config.presets);
    var searches = resolveSearches(gridId, config.searches);

    function startUp() {
      var optsVar = optionsVar;
      var optionsObj = optsVar && window[optsVar] ? window[optsVar] : {};

      var host = gv.byId ? gv.byId.get(gridId) : null;
      var gridDiv = document.getElementById(containerId);

      if (!host) {
        if (!gv.AgGrid || !gv.AgGrid.Host) return;
        host = new gv.AgGrid.Host(gridId, containerId, optionsObj, presets, searches, groupsOrder);
      } else {
        host.gridOptions = optionsObj;
        host.savedColPresets = presets || {};
        host.savedQuickSearches = searches || [];

        if (host.gridApi) {
          try {
            if (typeof host.gridApi.destroy === "function") {
              host.gridApi.destroy();
            }
          } catch (e) {
            console.warn(
              "[GridView.AgGrid] Clean destruction of old grid failed. Proceeding with DOM swap. Error:",
              e
            );
          }
          host.gridApi = null;
        }
      }

      if (!host.gridApi) {
        if (typeof agGrid !== "undefined") {
          host.initGrid();
        } else {
          var p = setInterval(function () {
            if (typeof agGrid !== "undefined") {
              clearInterval(p);
              host.initGrid();
            }
          }, 50);
          setTimeout(function () {
            clearInterval(p);
          }, 15000);
        }
      }
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", startUp);
    } else {
      startUp();
    }
    if (gv.byId) {
      gv.byId.registerBoot(gridId, startUp);
    }
  }

  document.querySelectorAll("script.cm-ag-grid-boot-config").forEach(function (node) {
    var config = parseBootConfig(node);
    if (config) bootFromConfig(config);
  });
})();
