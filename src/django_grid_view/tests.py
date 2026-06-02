from django.template import Engine
from django.test import SimpleTestCase


class AgGridTemplateTests(SimpleTestCase):
    def test_smart_filter_template_syntax(self):
        engine = Engine.get_default()
        template_name = "django_grid_view/plugins/smart_filter.html"
        try:
            template = engine.get_template(template_name)
            self.assertIsNotNone(template)
        except Exception as e:
            self.fail(f"Could not load {template_name}: {e}")

    def test_advanced_search_template_syntax(self):
        engine = Engine.get_default()
        template_name = "django_grid_view/plugins/advanced_search.html"
        try:
            template = engine.get_template(template_name)
            self.assertIsNotNone(template)
        except Exception as e:
            self.fail(f"Could not load {template_name}: {e}")

    def test_tooltip_template_syntax(self):
        engine = Engine.get_default()
        template_name = "django_grid_view/plugins/custom_tooltip.html"
        try:
            template = engine.get_template(template_name)
            self.assertIsNotNone(template)
        except Exception as e:
            self.fail(f"Could not load {template_name}: {e}")

    def test_scripts_template_syntax(self):
        engine = Engine.get_default()
        template_name = "django_grid_view/scripts.html"
        try:
            template = engine.get_template(template_name)
            self.assertIsNotNone(template)
        except Exception as e:
            self.fail(f"Could not load {template_name}: {e}")

    def test_toolbar_and_modal_template_syntax(self):
        engine = Engine.get_default()
        template_name = "django_grid_view/toolbar_and_modal.html"
        try:
            template = engine.get_template(template_name)
            self.assertIsNotNone(template)
        except Exception as e:
            self.fail(f"Could not load {template_name}: {e}")
