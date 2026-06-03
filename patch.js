(function() {
    let presets = {{ ag_grid_presets|default:"null"|safe }};
    let searches = {{ ag_grid_searches|default:"[]"|safe }};
    let groupsOrderRaw = "{{ groups_order|escapejs }}";
    let groupsOrder = groupsOrderRaw ? groupsOrderRaw.split(',').map(s => s.trim()) : [];
    
    if (!presets) presets = {};
    if (!searches) searches = [];
    
    function startUp() {
        const gv = window.GridView = window.GridView || window.CmGridView || {};
        if (!(gv.byId && gv.byId.get('{{ grid_id }}'))) {
            const host = new gv.AgGrid.Host('{{ grid_id }}', '{{ container_id }}', {{ options_var }}, presets, searches, groupsOrder);
            
            if (typeof agGrid !== 'undefined') {
                host.initGrid();
            } else {
                let p = setInterval(() => {
                    if (typeof agGrid !== 'undefined') {
                        clearInterval(p);
                        host.initGrid();
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
