import json

from django import template

from django_grid_table.models import GridPreference

register = template.Library()


def get_grid_state(context, grid_id):
    request = context.get("request")
    if not request or not request.user.is_authenticated:
        return "null", "[]"
    try:
        pref = GridPreference.objects.get(user=request.user, grid_id=grid_id)
        return json.dumps(pref.col_presets), json.dumps(pref.searches)
    except GridPreference.DoesNotExist:
        return "null", "[]"


@register.inclusion_tag("django_grid_table/toolbar_and_modal.html", takes_context=True)
def render_django_grid_table_toolbar(context, grid_id):
    presets, searches = get_grid_state(context, grid_id)
    return {"grid_id": grid_id, "ag_grid_presets": presets, "ag_grid_searches": searches}


@register.inclusion_tag("django_grid_table/search_bar.html")
def render_django_grid_table_search(grid_id):
    return {"grid_id": grid_id}


@register.inclusion_tag("django_grid_table/gear_button.html")
def render_django_grid_table_gear(grid_id):
    return {"grid_id": grid_id}


@register.inclusion_tag("django_grid_table/modal.html")
def render_django_grid_table_modal(grid_id):
    return {"grid_id": grid_id}


@register.inclusion_tag("django_grid_table/scripts.html", takes_context=True)
def django_grid_table_scripts(
    context,
    grid_id,
    options_var="gridOptions",
    container_id="myGrid",
    groups_order=None,
):
    presets, searches = get_grid_state(context, grid_id)
    if isinstance(groups_order, str):
        groups = [group.strip() for group in groups_order.split(",")]
    else:
        groups = groups_order
    return {
        "grid_id": grid_id,
        "options_var": options_var,
        "container_id": container_id,
        "groups_order": json.dumps(groups) if groups_order else "null",
        "ag_grid_presets": presets,
        "ag_grid_searches": searches,
    }
