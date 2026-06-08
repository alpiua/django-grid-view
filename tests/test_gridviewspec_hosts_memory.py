"""Tests for InMemoryHost."""

from __future__ import annotations

from grid_view_spec.hosts.memory import InMemoryHost, MemoryPrefs
from grid_view_spec.types.host import GridPrefs, GridViewHost


def test_in_memory_host_satisfies_protocol() -> None:
    host: GridViewHost = InMemoryHost(translations={"key.one": "One"})
    assert host.translate("key.one") == "One"
    assert host.url_for("export_pdf", table="t1") == "/export_pdf?table=t1"
    assert host.current_subject_id() == "test-subject"


def test_memory_prefs_roundtrip() -> None:
    store = MemoryPrefs()
    host = InMemoryHost(prefs=store, subject_id="u1")
    prefs = GridPrefs(searches=("q",))
    host.save_grid_prefs("u1", "grid1", prefs)
    assert host.get_grid_prefs("u1", "grid1") == prefs


def test_filter_state_from_request() -> None:
    host = InMemoryHost(filter_state={"period": ("2024-01",)})
    state = host.filter_state_from_request(object())
    assert state["period"] == ("2024-01",)
