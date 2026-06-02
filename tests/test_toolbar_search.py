"""Unified toolbar search partial and tag."""

from __future__ import annotations

import django
from django.template import Context, Template
from django.test import SimpleTestCase

django.setup()


class ToolbarSearchTemplateTests(SimpleTestCase):
    def test_render_toolbar_search_server_compact(self) -> None:
        tpl = Template(
            "{% load django_grid_view %}"
            "{% render_toolbar_search 'doctor-1' backend='server' value='foo' saved=True %}"
        )
        html = tpl.render(Context())
        self.assertIn('data-cm-search-backend="server"', html)
        self.assertIn('data-cm-toolbar-search', html)
        self.assertIn('cm-toolbar-search--compact', html)
        self.assertIn('data-cm-toolbar-search-action="save"', html)
        self.assertIn('value="foo"', html)

    def test_render_toolbar_search_grid(self) -> None:
        tpl = Template(
            "{% load django_grid_view %}"
            "{% render_toolbar_search 'orders' backend='grid' saved=True %}"
        )
        html = tpl.render(Context())
        self.assertIn('data-cm-search-backend="grid"', html)
        self.assertIn('data-cm-grid-search', html)
        self.assertIn('id="ag-quick-filter-orders"', html)
        self.assertIn('data-cm-grid-action="saveSearch"', html)
