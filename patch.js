(function() {
    let presets = {{ ag_grid_presets|default:"null"|safe }};
    let searches = {{ ag_grid_searches|default:"[]"|safe }};
    let groupsOrderRaw = "{{ groups_order|escapejs }}";
    let groupsOrder = groupsOrderRaw ? groupsOrderRaw.split(',').map(s => s.trim()) : [];
    
    if (!presets) presets = {};
    if (!searches) searches = [];
    
    function startUp() {
        if (!window['{{ grid_id }}Manager']) {
            const manager = new ContextGridManager('{{ grid_id }}', '{{ container_id }}', {{ options_var }}, presets, searches, groupsOrder);
            
            // Try to wait for ag-grid to be defined if it's injected asynchronously
            if (typeof agGrid !== 'undefined') {
                manager.initGrid();
            } else {
                let p = setInterval(() => {
                    if (typeof agGrid !== 'undefined') {
                        clearInterval(p);
                        manager.initGrid();
                    }
                }, 50);
                setTimeout(() => clearInterval(p), 15000);
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startUp);
    } else {
        startUp();
    }
})();
