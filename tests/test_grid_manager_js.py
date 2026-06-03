"""Column/search controls use data attributes + delegated actions (no inline onclick)."""

from __future__ import annotations

from django.template import Context, Template
from django.test import SimpleTestCase


class GridManagerActionMarkupTests(SimpleTestCase):
    def test_gear_button_uses_data_attributes(self) -> None:
        template = Template(
            "{% load django_grid_view %}{% render_django_grid_view_gear 'order-26488' %}"
        )
        html = template.render(Context())
        self.assertIn('data-cm-col-action="toggle"', html)
        self.assertIn('data-cm-grid-id="order-26488"', html)
        self.assertNotIn("onclick=", html)
        self.assertNotIn("Manager", html)

    def test_modal_uses_data_attributes(self) -> None:
        template = Template(
            "{% load django_grid_view %}{% render_django_grid_view_modal 'order-26488' %}"
        )
        html = template.render(Context())
        self.assertIn('data-cm-col-action="reset"', html)
        self.assertIn('data-cm-col-action="savePreset"', html)
        self.assertIn('data-cm-grid-id="order-26488"', html)
        self.assertNotIn("onclick=", html)

    def test_search_bar_uses_data_attributes(self) -> None:
        template = Template(
            "{% load django_grid_view %}{% render_django_grid_view_search 'order-26488' %}"
        )
        html = template.render(Context())
        self.assertIn('data-cm-grid-search', html)
        self.assertIn('data-cm-grid-action="clearSearch"', html)
        self.assertNotIn("onclick=", html)
        self.assertNotIn("oninput=", html)
