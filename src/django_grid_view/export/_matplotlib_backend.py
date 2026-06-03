"""Thread-safe matplotlib backend for server-side chart rasterization."""

from __future__ import annotations

_configured = False


def configure_matplotlib_agg() -> None:
    """Use non-GUI Agg backend (safe in worker threads / async servers)."""
    global _configured
    if _configured:
        return
    import matplotlib

    if matplotlib.get_backend().casefold() != "agg":
        matplotlib.use("Agg")
    _configured = True
