"""The committed TS types must stay in sync with schema/grid-view-spec.v2.json.

The schema is the single source of truth; ``frontend/src/types/generated/`` is
generated from it via ``npm run gen:types``. This test runs the generator's
``--check`` mode and fails if the committed output has drifted. It is skipped
when the Node toolchain or generator deps are unavailable (e.g. a Python-only
CI shard); the same check also runs in ``scripts/ci-gate.sh``.
"""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

import pytest

_FRONTEND = Path(__file__).resolve().parent.parent / "frontend"
_GEN_SCRIPT = _FRONTEND / "scripts" / "gen-types.mjs"
_J2T = _FRONTEND / "node_modules" / "json-schema-to-typescript"


@pytest.mark.skipif(shutil.which("node") is None, reason="node toolchain not available")
@pytest.mark.skipif(not _J2T.exists(), reason="json-schema-to-typescript not installed")
def test_generated_ts_types_match_schema() -> None:
    result = subprocess.run(
        ["node", str(_GEN_SCRIPT), "--check"],
        cwd=_FRONTEND,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, (
        "TS types are stale vs schema/grid-view-spec.v2.json. "
        "Run `cd frontend && npm run gen:types` and commit the result.\n"
        f"{result.stdout}\n{result.stderr}"
    )
