from __future__ import annotations

from dataclasses import replace

from grid_view_spec.types.content import GridViewTab, GridViewTabs, GridViewTemplate
from grid_view_spec.types.filters_v2 import GridViewFilters, GridViewFilterState
from grid_view_spec.types.layout import GridViewArea, GridViewLayout
from grid_view_spec.types.overlay import GridViewOverlay
from grid_view_spec.types.result import GridViewPolicy
from grid_view_spec.types.spec import GridViewSpec
from grid_view_spec.types.table_v2 import GridViewColumn, GridViewTable
from grid_view_spec.types.toolbar import GridViewSearch, GridViewToolbar
from grid_view_spec.validate import codes as c
from grid_view_spec.validate import validate_spec
from tests.gridviewspec_fixtures import header_with_template_spec, minimal_valid_spec


def test_minimal_valid_spec_ok() -> None:
    result = validate_spec(minimal_valid_spec())
    assert result.ok
    assert not result.diagnostics


def test_duplicate_block_id_error() -> None:
    spec = minimal_valid_spec()
    duplicate = replace(
        spec,
        blocks=spec.blocks + (GridViewTable(id="records_table", columns=()),),
    )
    result = validate_spec(duplicate)
    assert not result.ok
    assert any(d.code == c.DUPLICATE_BLOCK_ID for d in result.diagnostics)


def test_missing_layout_ref_error() -> None:
    spec = replace(
        minimal_valid_spec(),
        layout=GridViewLayout(
            root=GridViewArea(id="root", blocks=("missing_block",)),
        ),
    )
    result = validate_spec(spec)
    assert not result.ok
    assert any(d.code == c.MISSING_LAYOUT_REF for d in result.diagnostics)


def test_missing_block_ref_on_toolbar_filters() -> None:
    spec = replace(
        minimal_valid_spec(),
        blocks=tuple(b for b in minimal_valid_spec().blocks if b.id != "page_filters")
        + (
            GridViewToolbar(
                id="toolbar_records",
                filters="missing_filters",
                target="records_table",
            ),
            GridViewTable(id="records_table", columns=()),
        ),
    )
    result = validate_spec(spec)
    assert not result.ok
    assert any(d.code == c.MISSING_BLOCK_REF for d in result.diagnostics)


def test_invalid_header_content_must_be_template() -> None:
    spec = replace(
        header_with_template_spec(),
        blocks=(
            replace(header_with_template_spec().blocks[0], content="doctor_header"),
            header_with_template_spec().blocks[1],
        ),
    )
    result = validate_spec(spec)
    assert not result.ok
    assert any(d.code == c.INVALID_HEADER_CONTENT for d in result.diagnostics)


def test_invalid_tab_target_xor() -> None:
    spec = GridViewSpec(
        id="tabs_page",
        blocks=(
            GridViewTabs(
                id="period_tabs",
                tabs=(GridViewTab(id="t1", label="A", area="area_a", block="records_table"),),
            ),
            GridViewTable(id="records_table", columns=()),
        ),
        layout=GridViewLayout(
            root=GridViewArea(
                id="root",
                blocks=("period_tabs",),
                areas=(GridViewArea(id="area_a"),),
            )
        ),
    )
    result = validate_spec(spec)
    assert not result.ok
    assert any(d.code == c.INVALID_TAB_TARGET for d in result.diagnostics)


def test_duplicate_table_search_error() -> None:
    spec = minimal_valid_spec()
    extra_toolbar = GridViewToolbar(
        id="toolbar_records_2",
        search=GridViewSearch(bind="records_table"),
        target="records_table",
    )
    result = validate_spec(replace(spec, blocks=spec.blocks + (extra_toolbar,)))
    assert not result.ok
    assert any(d.code == c.DUPLICATE_TABLE_SEARCH for d in result.diagnostics)


def test_filter_target_mismatch_error() -> None:
    spec = minimal_valid_spec()
    blocks = list(spec.blocks)
    for index, block in enumerate(blocks):
        if isinstance(block, GridViewFilters):
            blocks[index] = replace(block, target="other_table")
    result = validate_spec(replace(spec, blocks=tuple(blocks)))
    assert not result.ok
    assert any(d.code == c.FILTER_TARGET_MISMATCH for d in result.diagnostics)


def test_invalid_filter_state_for_multiselect() -> None:
    spec = minimal_valid_spec()
    blocks = list(spec.blocks)
    for index, block in enumerate(blocks):
        if isinstance(block, GridViewFilters):
            blocks[index] = replace(
                block,
                state=GridViewFilterState(values={"period": "2024-01"}),
            )
    result = validate_spec(replace(spec, blocks=tuple(blocks)))
    assert not result.ok
    assert any(d.code == c.INVALID_FILTER_STATE for d in result.diagnostics)


def test_unknown_chart_option_when_strict() -> None:
    from grid_view_spec.types.content import GridViewChart, GridViewCharts

    spec = GridViewSpec(
        id="chart_page",
        blocks=(
            GridViewCharts(
                id="charts",
                charts=(
                    GridViewChart(
                        id="c1",
                        options={"unknown_key": "x"},
                    ),
                ),
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("charts",))),
    )
    result = validate_spec(spec, policy=GridViewPolicy(strict_unknown_config=True))
    assert not result.ok
    assert any(d.code == c.UNKNOWN_CHART_OPTION for d in result.diagnostics)


def test_nested_overlay_duplicate_id_error() -> None:
    nested = GridViewSpec(
        id="nested",
        blocks=(GridViewTemplate(id="records_table"),),
        layout=GridViewLayout(root=GridViewArea(id="root")),
    )
    spec = GridViewSpec(
        id="page",
        blocks=(
            GridViewTable(id="records_table", columns=()),
            GridViewOverlay(id="overlay", spec=nested),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("records_table", "overlay"))),
    )
    result = validate_spec(spec)
    assert not result.ok
    assert any(d.code == c.DUPLICATE_BLOCK_ID for d in result.diagnostics)


def test_unknown_renderer_when_registry_set() -> None:
    spec = replace(
        minimal_valid_spec(),
        blocks=tuple(
            replace(b, columns=(GridViewColumn(id="c1", label="C", renderer="custom_unknown"),))
            if isinstance(b, GridViewTable)
            else b
            for b in minimal_valid_spec().blocks
        ),
    )
    result = validate_spec(
        spec,
        policy=GridViewPolicy(registered_renderers=("only_this",)),
    )
    assert not result.ok
    assert any(d.code == c.UNKNOWN_RENDERER for d in result.diagnostics)


def test_toolbar_target_must_reference_a_table() -> None:
    """V2: toolbar.target must point to an existing table block (not a chart/nav/None-id)."""
    spec = replace(
        minimal_valid_spec(),
        blocks=tuple(
            replace(b, target="missing_table") if isinstance(b, GridViewToolbar) else b
            for b in minimal_valid_spec().blocks
        ),
    )
    result = validate_spec(spec)
    assert not result.ok
    assert any(d.code == c.INVALID_BLOCK_TARGET for d in result.diagnostics)

    # target pointing at a non-table block is also invalid.
    spec2 = replace(
        minimal_valid_spec(),
        blocks=tuple(
            replace(b, target="page_header") if isinstance(b, GridViewToolbar) else b
            for b in minimal_valid_spec().blocks
        ),
    )
    result2 = validate_spec(spec2)
    assert not result2.ok
    assert any(d.code == c.INVALID_BLOCK_TARGET for d in result2.diagnostics)


def test_filters_target_must_reference_table_or_chart() -> None:
    """V1: filters.target must point to an existing table or chart block."""
    spec = replace(
        minimal_valid_spec(),
        blocks=tuple(
            replace(b, target="missing_target") if isinstance(b, GridViewFilters) else b
            for b in minimal_valid_spec().blocks
        ),
    )
    result = validate_spec(spec)
    assert not result.ok
    assert any(d.code == c.INVALID_BLOCK_TARGET for d in result.diagnostics)

    # target pointing at a header (not table/chart) is invalid.
    spec2 = replace(
        minimal_valid_spec(),
        blocks=tuple(
            replace(b, target="page_header") if isinstance(b, GridViewFilters) else b
            for b in minimal_valid_spec().blocks
        ),
    )
    result2 = validate_spec(spec2)
    assert not result2.ok
    assert any(d.code == c.INVALID_BLOCK_TARGET for d in result2.diagnostics)


def test_chart_data_source_invalid_value_error() -> None:
    """V3: chart options data_source must be 'static' or 'grid_filtered'."""
    from grid_view_spec.types.content import GridViewChart, GridViewCharts

    spec = GridViewSpec(
        id="chart_ds_page",
        blocks=(
            GridViewCharts(
                id="charts",
                charts=(GridViewChart(id="c1", options={"data_source": "rows"}),),
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("charts",))),
    )
    result = validate_spec(spec)
    assert not result.ok
    assert any(d.code == c.INVALID_CHART_OPTION_VALUE for d in result.diagnostics)

    # Valid values pass without strict_unknown_config.
    spec_ok = GridViewSpec(
        id="chart_ds_ok",
        blocks=(
            GridViewCharts(
                id="charts",
                charts=(
                    GridViewChart(id="c1", options={"data_source": "grid_filtered"}),
                    GridViewChart(id="c2", options={"data_source": "static"}),
                ),
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("charts",))),
    )
    assert validate_spec(spec_ok).ok


def test_editable_column_without_edit_config() -> None:
    """EDITABLE_WITHOUT_EDIT: editable column on a table with no edit config."""
    spec = replace(
        minimal_valid_spec(),
        blocks=tuple(
            replace(b, columns=(GridViewColumn(id="c1", label="C", editable=True),))
            if isinstance(b, GridViewTable)
            else b
            for b in minimal_valid_spec().blocks
        ),
    )
    result = validate_spec(spec)
    assert not result.ok
    assert any(d.code == c.EDITABLE_WITHOUT_EDIT for d in result.diagnostics)


def test_edit_commit_xor_both_set() -> None:
    """EDIT_COMMIT_XOR: setting both commit_endpoint and commit_callback is invalid."""
    from grid_view_spec.types.table_v2 import GridViewTableEdit

    spec = replace(
        minimal_valid_spec(),
        blocks=tuple(
            replace(
                b,
                columns=(GridViewColumn(id="c1", label="C", editable=True),),
                edit=GridViewTableEdit(mode="cell", commit_endpoint="/c", commit_callback="cb"),
            )
            if isinstance(b, GridViewTable)
            else b
            for b in minimal_valid_spec().blocks
        ),
    )
    result = validate_spec(spec)
    assert not result.ok
    assert any(d.code == c.EDIT_COMMIT_XOR for d in result.diagnostics)


def test_edit_commit_xor_neither_set() -> None:
    """EDIT_COMMIT_XOR: setting neither commit source is invalid."""
    from grid_view_spec.types.table_v2 import GridViewTableEdit

    spec = replace(
        minimal_valid_spec(),
        blocks=tuple(
            replace(b, edit=GridViewTableEdit(mode="cell")) if isinstance(b, GridViewTable) else b
            for b in minimal_valid_spec().blocks
        ),
    )
    result = validate_spec(spec)
    assert not result.ok
    assert any(d.code == c.EDIT_COMMIT_XOR for d in result.diagnostics)


def test_gallery_no_source_warning() -> None:
    """GALLERY_NO_SOURCE: a source-less gallery is advisory (warning), not an error.

    A gallery may legitimately be filled at runtime (client-side, e.g. a paired
    lightbox template) with no declarative source the validator can see, so the
    spec stays valid (``ok``) while still surfacing the hint.
    """
    from grid_view_spec.types.media import GridViewGallery

    spec = GridViewSpec(
        id="gallery_page",
        blocks=(GridViewGallery(id="g1", images=()),),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("g1",))),
    )
    result = validate_spec(spec)
    assert result.ok
    diag = next(d for d in result.diagnostics if d.code == c.GALLERY_NO_SOURCE)
    assert diag.severity == "warning"


def test_gallery_lazy_suppresses_no_source() -> None:
    """A lazy gallery is populated by its fragment loader — no GALLERY_NO_SOURCE."""
    from grid_view_spec.types.lazy import GridViewLazyBlock
    from grid_view_spec.types.media import GridViewGallery

    spec = GridViewSpec(
        id="gallery_page",
        blocks=(GridViewGallery(id="g1", images=(), lazy=GridViewLazyBlock(endpoint="/g/")),),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("g1",))),
    )
    result = validate_spec(spec)
    assert result.ok
    assert not any(d.code == c.GALLERY_NO_SOURCE for d in result.diagnostics)


def test_image_no_url_error() -> None:
    """IMAGE_NO_URL: image block whose source has no url/thumb/variants."""
    from grid_view_spec.types.media import GridViewImage, GridViewImageSource

    spec = GridViewSpec(
        id="image_page",
        blocks=(GridViewImage(id="img1", image=GridViewImageSource(id="src1")),),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("img1",))),
    )
    result = validate_spec(spec)
    assert not result.ok
    assert any(d.code == c.IMAGE_NO_URL for d in result.diagnostics)


def test_unknown_validator_kind_error() -> None:
    """UNKNOWN_VALIDATOR_KIND: validator kind outside the allowed Literal."""
    from grid_view_spec.types.form import GridViewField, GridViewForm, GridViewValidator

    # Construct a validator with an out-of-contract kind without defeating the type
    # checker: the frozen dataclass accepts any str at runtime, so bypass __init__
    # and set the slot explicitly to the invalid value under test.
    invalid = GridViewValidator.__new__(GridViewValidator)
    object.__setattr__(invalid, "kind", "bogus")
    object.__setattr__(invalid, "value", None)
    object.__setattr__(invalid, "message", "")
    object.__setattr__(invalid, "name", "")

    spec = GridViewSpec(
        id="form_page",
        blocks=(
            GridViewForm(
                id="frm1",
                fields=(
                    GridViewField(
                        name="x",
                        validators=(invalid,),
                    ),
                ),
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("frm1",))),
    )
    result = validate_spec(spec)
    assert not result.ok
    assert any(d.code == c.UNKNOWN_VALIDATOR_KIND for d in result.diagnostics)


def test_pattern_requires_value_error() -> None:
    """PATTERN_REQUIRES_VALUE: pattern validator without a regex value."""
    from grid_view_spec.types.form import GridViewField, GridViewForm, GridViewValidator

    spec = GridViewSpec(
        id="form_page",
        blocks=(
            GridViewForm(
                id="frm1",
                fields=(
                    GridViewField(
                        name="x",
                        validators=(GridViewValidator(kind="pattern"),),
                    ),
                ),
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("frm1",))),
    )
    result = validate_spec(spec)
    assert not result.ok
    assert any(d.code == c.PATTERN_REQUIRES_VALUE for d in result.diagnostics)


def test_custom_validator_missing_name_error() -> None:
    """CUSTOM_VALIDATOR_MISSING_NAME: custom validator without a name."""
    from grid_view_spec.types.form import GridViewField, GridViewForm, GridViewValidator

    spec = GridViewSpec(
        id="form_page",
        blocks=(
            GridViewForm(
                id="frm1",
                fields=(
                    GridViewField(
                        name="x",
                        validators=(GridViewValidator(kind="custom"),),
                    ),
                ),
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("frm1",))),
    )
    result = validate_spec(spec)
    assert not result.ok
    assert any(d.code == c.CUSTOM_VALIDATOR_MISSING_NAME for d in result.diagnostics)


def test_form_field_duplicate_name_error() -> None:
    """FORM_FIELD_DUPLICATE_NAME: two fields share a name."""
    from grid_view_spec.types.form import GridViewField, GridViewForm

    spec = GridViewSpec(
        id="form_page",
        blocks=(
            GridViewForm(
                id="frm1",
                fields=(
                    GridViewField(name="email"),
                    GridViewField(name="email"),
                ),
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("frm1",))),
    )
    result = validate_spec(spec)
    assert not result.ok
    assert any(d.code == c.FORM_FIELD_DUPLICATE_NAME for d in result.diagnostics)


def test_fieldset_unknown_field_error() -> None:
    """FIELDSET_UNKNOWN_FIELD: fieldset references a field not in the form."""
    from grid_view_spec.types.form import GridViewField, GridViewFieldset, GridViewForm

    spec = GridViewSpec(
        id="form_page",
        blocks=(
            GridViewForm(
                id="frm1",
                fields=(GridViewField(name="email"),),
                fieldsets=(GridViewFieldset(id="fs1", fields=("missing",)),),
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("frm1",))),
    )
    result = validate_spec(spec)
    assert not result.ok
    assert any(d.code == c.FIELDSET_UNKNOWN_FIELD for d in result.diagnostics)


def test_trusted_css_vars_denied_by_policy() -> None:
    """TRUSTED_CSS_VARS_DENIED: css_vars set while policy forbids them."""
    from grid_view_spec.types.header import GridViewHeader
    from grid_view_spec.types.layout import GridViewTrustedStyle

    spec = replace(
        minimal_valid_spec(),
        blocks=tuple(
            replace(b, trusted_style=GridViewTrustedStyle(css_vars={"--c": "red"}))
            if isinstance(b, GridViewHeader)
            else b
            for b in minimal_valid_spec().blocks
        ),
    )
    result = validate_spec(spec, policy=GridViewPolicy(allow_trusted_css_vars=False))
    assert not result.ok
    assert any(d.code == c.TRUSTED_CSS_VARS_DENIED for d in result.diagnostics)

    # Allowed when policy permits.
    result_ok = validate_spec(spec, policy=GridViewPolicy(allow_trusted_css_vars=True))
    assert not any(d.code == c.TRUSTED_CSS_VARS_DENIED for d in result_ok.diagnostics)


def test_no_callables_or_orm_in_spec() -> None:
    """NON_SERIALIZABLE_VALUE: callables and arbitrary objects are rejected anywhere in the spec."""
    spec = replace(
        minimal_valid_spec(),
        blocks=tuple(
            replace(b, extra={"hook": lambda: 1}) if isinstance(b, GridViewTable) else b
            for b in minimal_valid_spec().blocks
        ),
    )
    result = validate_spec(spec)
    assert not result.ok
    assert any(d.code == c.NON_SERIALIZABLE_VALUE for d in result.diagnostics)

    # A clean spec has no non-serializable diagnostics.
    clean = validate_spec(minimal_valid_spec())
    assert not any(d.code == c.NON_SERIALIZABLE_VALUE for d in clean.diagnostics)

    # An arbitrary object (stand-in for an ORM instance) is also rejected.
    class _FakeOrmRow:
        pass

    spec_orm = replace(
        minimal_valid_spec(),
        blocks=tuple(
            replace(b, rows=({"id": 1},)) if isinstance(b, GridViewTable) else b
            for b in minimal_valid_spec().blocks
        ),
    )
    # Inject a non-JsonValue object into the rows tuple via extra (rows is typed).
    spec_orm = replace(
        spec_orm,
        blocks=tuple(
            replace(b, extra={"row": _FakeOrmRow()}) if isinstance(b, GridViewTable) else b
            for b in spec_orm.blocks
        ),
    )
    result_orm = validate_spec(spec_orm)
    assert not result_orm.ok
    assert any(d.code == c.NON_SERIALIZABLE_VALUE for d in result_orm.diagnostics)
