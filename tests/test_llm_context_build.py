from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUNDLE = ROOT / "docs" / "llm" / "grid-view-spec-llm-context.md"
SCRIPT = ROOT / "scripts" / "build_llm_context.py"


def test_build_llm_context_produces_bundle() -> None:
    subprocess.run(
        [sys.executable, str(SCRIPT)],
        cwd=ROOT,
        check=True,
    )
    assert BUNDLE.is_file()
    text = BUNDLE.read_text(encoding="utf-8")
    assert "grid-view-spec — LLM context bundle" in text
    assert "<!-- source: getting-started.md -->" in text
    assert "<!-- source: reference/template-tags.md -->" in text
    assert "{% render_grid_view_spec spec rows %}" in text
    assert "{% raw %}" not in text
