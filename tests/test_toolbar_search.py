"""Unified toolbar search partial and tag."""

from __future__ import annotations

import django
from django.template import Context, Template, TemplateSyntaxError
from django.test import SimpleTestCase

django.setup()


class ToolbarSearchTemplateTests(SimpleTestCase):
    def test_render_toolbar_search_server_compact(self) -> None:
        tpl = Template(
            "{% load django_grid_view %}"
            "{% render_toolbar_search 'order-1' backend='server' value='foo' saved=True %}"
        )
        html = tpl.render(Context())
        self.assertIn('data-cm-search-backend="server"', html)
        self.assertIn("data-cm-toolbar-search", html)
        self.assertIn("cm-toolbar-search--compact", html)
        self.assertIn("cm-toolbar-search-action--save", html)
        self.assertIn('value="foo"', html)

    def test_render_toolbar_search_ag_grid(self) -> None:
        tpl = Template(
            "{% load django_grid_view %}"
            "{% render_toolbar_search 'orders' backend='ag_grid' saved=True %}"
        )
        html = tpl.render(Context())
        self.assertIn('data-cm-search-backend="ag_grid"', html)
        self.assertIn("data-cm-grid-search", html)
        self.assertIn('id="ag-quick-filter-orders"', html)
        self.assertIn('data-cm-grid-action="saveSearch"', html)

    def test_render_toolbar_search_rejects_legacy_grid_backend(self) -> None:
        tpl = Template(
            "{% load django_grid_view %}{% render_toolbar_search 'orders' backend='grid' %}"
        )
        with self.assertRaisesMessage(
            TemplateSyntaxError,
            "backend='grid' was renamed to backend='ag_grid'",
        ):
            tpl.render(Context())
