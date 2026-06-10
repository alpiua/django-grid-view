"""MkDocs hook: expose raw LLM context file for download on the built site."""

from __future__ import annotations

import shutil
from pathlib import Path
from typing import Protocol


class _MkdocsBuildConfig(Protocol):
    docs_dir: str
    site_dir: str


def on_post_build(config: _MkdocsBuildConfig, **kwargs: object) -> None:
    src = Path(config.docs_dir) / "llm" / "grid-view-spec-llm-context.md"
    if not src.is_file():
        return
    dest_dir = Path(config.site_dir) / "llm"
    dest_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dest_dir / "grid-view-spec-llm-context.md")
