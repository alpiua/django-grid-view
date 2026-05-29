from django.template import Engine


def test_package_templates_compile():
    engine = Engine.get_default()

    for template_name in [
        "django_grid_table/plugins/smart_filter.html",
        "django_grid_table/plugins/advanced_search.html",
        "django_grid_table/plugins/custom_tooltip.html",
        "django_grid_table/scripts.html",
        "django_grid_table/toolbar_and_modal.html",
    ]:
        assert engine.get_template(template_name)
