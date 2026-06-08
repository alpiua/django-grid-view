"""Django backend views and search adapter tests."""

from __future__ import annotations

import json

import pytest
from django.contrib.auth.models import User
from django.http import Http404
from django.test import RequestFactory

from grid_view_spec.backends.django.host import DjangoGridViewHost
from grid_view_spec.backends.django.search import parse_column_filters_from_request
from grid_view_spec.backends.django.views import django_host, save_grid_prefs

pytestmark = pytest.mark.django_db


def test_django_search_helpers_importable() -> None:
    factory = RequestFactory()
    request = factory.get("/page/?col_q=%7B%22name%22%3A%22a%22%7D")
    filters = parse_column_filters_from_request(request)
    assert filters["name"] == "a"


def test_save_grid_prefs_uses_host_protocol() -> None:
    user = User.objects.create_user(username="prefs_user", password="pass")
    factory = RequestFactory()
    body = json.dumps(
        {
            "grid_id": "records",
            "colPresets": {"name": {"visible": True}},
            "searches": ["alpha"],
        }
    )
    request = factory.post("/grid/prefs/", data=body, content_type="application/json")
    request.user = user
    response = save_grid_prefs(request)
    assert response.status_code == 200
    host = django_host(request)
    subject_id = host.current_subject_id()
    assert subject_id is not None
    prefs = host.get_grid_prefs(subject_id, "records")
    assert prefs.col_presets["name"]["visible"] is True
    assert prefs.searches == ("alpha",)


def test_grid_prefs_rejects_mismatched_subject_id() -> None:
    user = User.objects.create_user(username="other_user", password="pass")
    factory = RequestFactory()
    request = factory.get("/page/")
    request.user = user
    host = django_host(request)
    subject_id = host.current_subject_id()
    assert subject_id is not None
    wrong_subject = "999999"
    assert wrong_subject != subject_id
    prefs = host.get_grid_prefs(wrong_subject, "records")
    assert prefs.col_presets == {}
    assert prefs.searches == ()


def test_export_views_accept_host_parameter() -> None:
    from django.contrib.auth.models import AnonymousUser

    from grid_view_spec.backends.django.views import export_pdf, export_xlsx

    factory = RequestFactory()
    request = factory.get("/export/pdf/?builder=missing")
    request.user = AnonymousUser()
    host = DjangoGridViewHost(request)
    with pytest.raises(Http404):
        export_pdf(request, host=host)
    request = factory.get("/export/xlsx/?builder=missing")
    request.user = AnonymousUser()
    with pytest.raises(Http404):
        export_xlsx(request, host=host)


def test_export_views_use_vnext_registry_entries() -> None:
    from django.contrib.auth.models import AnonymousUser

    from grid_view_spec.backends.django.views import export_pdf
    from grid_view_spec.export.registry import (
        clear_pdf_exports,
        get_pdf_export,
        register_pdf_export,
    )
    from grid_view_spec.types.layout import GridViewArea, GridViewLayout
    from grid_view_spec.types.spec import GridViewSpec
    from grid_view_spec.types.table_v2 import GridViewColumn, GridViewTable

    spec = GridViewSpec(
        id="vnext-export",
        blocks=(
            GridViewTable(
                id="records",
                backend="simple",
                columns=(GridViewColumn(id="name", label="Name", field="name"),),
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("records",))),
    )

    def builder(host: object, ctx: object):
        from grid_view_spec.export.registry import GridViewExportJob

        _ = host
        _ = ctx
        return GridViewExportJob(
            spec=spec,
            rows=({"name": "VNext"},),
            table_id="records",
        )

    clear_pdf_exports()
    register_pdf_export("vnext-only", builder)
    assert get_pdf_export("vnext-only").builder is builder

    factory = RequestFactory()
    request = factory.get("/export/pdf/?builder=vnext-only")
    request.user = AnonymousUser()
    response = export_pdf(request, host=DjangoGridViewHost(request))
    assert response.status_code == 200
    assert response["Content-Type"].startswith("application/pdf")
    assert response.content.startswith(b"%PDF")
    clear_pdf_exports()


def test_load_lazy_block_renders_registered_page() -> None:
    from grid_view_spec.backends.django.lazy import (
        clear_lazy_page_loaders,
        register_lazy_page_loader,
    )
    from grid_view_spec.backends.django.views import load_lazy_block
    from grid_view_spec.types.layout import GridViewArea, GridViewLayout
    from grid_view_spec.types.spec import GridViewSpec
    from grid_view_spec.types.table_v2 import GridViewColumn, GridViewTable

    pytest.importorskip("jinja2")

    spec = GridViewSpec(
        id="lazy-page",
        blocks=(
            GridViewTable(
                id="records",
                backend="simple",
                columns=(GridViewColumn(id="name", label="Name", field="name"),),
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("records",))),
    )
    rows = ({"name": "LazyRow"},)

    def loader(
        host: object, request: object
    ) -> tuple[GridViewSpec, tuple[dict[str, str], ...], str]:
        _ = host
        _ = request
        return spec, rows, "records"

    clear_lazy_page_loaders()
    register_lazy_page_loader("demo", loader)
    request = RequestFactory().get("/lazy/?page=demo&block_id=records")
    response = load_lazy_block(request, host=DjangoGridViewHost(request))
    assert response.status_code == 200
    assert b"LazyRow" in response.content
    assert b'data-export-cols="name"' in response.content
    clear_lazy_page_loaders()


def test_load_lazy_block_requires_page_parameter() -> None:
    from grid_view_spec.backends.django.views import load_lazy_block

    request = RequestFactory().get("/lazy/")
    response = load_lazy_block(request, host=DjangoGridViewHost(request))
    assert response.status_code == 400
    assert b"missing page query parameter" in response.content


def test_load_lazy_block_rejects_unknown_block_id() -> None:
    from grid_view_spec.backends.django.lazy import (
        clear_lazy_page_loaders,
        register_lazy_page_loader,
    )
    from grid_view_spec.backends.django.views import load_lazy_block
    from grid_view_spec.types.layout import GridViewArea, GridViewLayout
    from grid_view_spec.types.spec import GridViewSpec
    from grid_view_spec.types.table_v2 import GridViewColumn, GridViewTable

    spec = GridViewSpec(
        id="lazy-page",
        blocks=(
            GridViewTable(
                id="records",
                backend="simple",
                columns=(GridViewColumn(id="name", label="Name", field="name"),),
            ),
        ),
        layout=GridViewLayout(root=GridViewArea(id="root", blocks=("records",))),
    )

    def loader(host: object, request: object) -> tuple[GridViewSpec, tuple[()], str]:
        _ = host
        _ = request
        return spec, (), "records"

    clear_lazy_page_loaders()
    register_lazy_page_loader("demo", loader)
    request = RequestFactory().get("/lazy/?page=demo&block_id=missing")
    response = load_lazy_block(request, host=DjangoGridViewHost(request))
    assert response.status_code == 400
    assert b"unknown block_id" in response.content
    clear_lazy_page_loaders()
