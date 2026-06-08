"""Phase 11 shim hooks — constants and optional deprecation warnings.

Full package rename (PyPI ``grid-view-spec`` + meta ``django-grid-view``) flips ``SHIM_ENABLED``.
Until then, legacy ``django_grid_view`` exports remain the real implementations.
"""

from __future__ import annotations

import warnings

SHIM_ENABLED: bool = False
VNEXT_DIST_NAME: str = "grid-view-spec"
VNEXT_IMPORT_ROOT: str = "grid_view_spec"
LEGACY_DIST_NAME: str = "django-grid-view"


def warn_legacy_public_import(symbol: str, *, replacement: str) -> None:
    """Emit a one-time style deprecation warning when the Phase 11 shim is enabled."""
    if not SHIM_ENABLED:
        return
    warnings.warn(
        (
            f"{symbol!r} from django_grid_view is deprecated; "
            f"use {replacement} from {VNEXT_IMPORT_ROOT} instead."
        ),
        DeprecationWarning,
        stacklevel=3,
    )
