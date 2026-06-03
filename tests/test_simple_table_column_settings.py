"""Tests for SimpleTable column settings + export resolution."""

from __future__ import annotations

from django.test import RequestFactory, SimpleTestCase

from django_grid_view.export.table_columns import resolve_simple_table_for_export
from django_grid_view.tables import Column, SimpleTableConfig


class SimpleTableColumnSettingsTests(SimpleTestCase):
    def _config(self) -> SimpleTableConfig:
        return SimpleTableConfig(
            grid_id="demo",
            columns=[
                Column(key="a", label="A"),
                Column(key="b", label="B", hide=True),
                Column(key="c", label="C", exportable=False),
            ],
            data=[{"a": 1, "b": 2, "c": 3}],
            column_settings=True,
        )

    def test_default_visible_export_keys(self) -> None:
        config = self._config()
        self.assertEqual(config.default_visible_export_keys(), ["a"])

    def test_resolve_export_columns_from_request(self) -> None:
        config = self._config()
        request = RequestFactory().get("/", {"export_cols": "b,a"})
        narrowed = resolve_simple_table_for_export(config, request)
        self.assertEqual([col.key for col in narrowed.columns], ["b", "a"])

    def test_resolve_artifact_table_for_export(self) -> None:
        from django_grid_view.export.table_columns import resolve_artifact_table_for_export
        from django_grid_view.render.builder import build_artifact_from_view
        from django_grid_view.types import GridViewSpec, ViewLayout
        from django_grid_view.types.enums import BlockType

        config = self._config()
        spec = GridViewSpec(
            grid_id="demo",
            title="",
            columns=(),
            layout=ViewLayout(blocks=(BlockType.TABLE,)),
        )
        artifact = build_artifact_from_view(spec, [], table=config)
        request = RequestFactory().get("/", {"export_cols": "b,a"})
        narrowed = resolve_artifact_table_for_export(artifact, request)
        assert narrowed.table is not None
        self.assertEqual([col.key for col in narrowed.table.columns], ["b", "a"])

    def test_column_settings_meta_uses_group_units(self) -> None:
        from django_grid_view.tables import ColumnGroup

        config = SimpleTableConfig(
            grid_id="g",
            columns=[
                Column(key="a", label="A"),
                Column(key="b", label="B"),
                Column(key="solo", label="Solo"),
            ],
            data=[],
            column_settings=True,
            column_groups=[ColumnGroup(label="Pair", column_keys=["a", "b"], key="pair")],
        )
        meta = config.column_settings_meta()
        self.assertEqual(len(meta), 2)
        self.assertTrue(meta[0]["isGroup"])
        self.assertEqual(meta[0]["colId"], "group:pair")
        self.assertEqual(meta[0]["columnKeys"], ["a", "b"])
        self.assertFalse(meta[1]["isGroup"])
        self.assertEqual(meta[1]["colId"], "solo")
