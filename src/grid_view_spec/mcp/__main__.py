"""Allow ``python -m grid_view_spec.mcp`` as an alternative to the console script."""

from __future__ import annotations

import sys

from grid_view_spec.mcp.server import main

if __name__ == "__main__":
    sys.exit(main())
