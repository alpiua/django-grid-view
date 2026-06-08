"""Shared pytest hooks for django-grid-view."""

from __future__ import annotations

import pytest
from phase11_compat import COMPATIBILITY_TEST_MODULES

__all__ = ["COMPATIBILITY_TEST_MODULES"]


def pytest_collection_modifyitems(items: list[pytest.Item]) -> None:
    for item in items:
        if item.path.name in COMPATIBILITY_TEST_MODULES:
            item.add_marker(pytest.mark.compatibility)
