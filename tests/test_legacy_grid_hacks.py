"""Guard against legacy Context* / Manager globals and inline onclick hacks."""

from __future__ import annotations

import re
from pathlib import Path

from django.test import SimpleTestCase

PACKAGE_ROOT = Path(__file__).resolve().parents[1] / "src" / "django_grid_view"

FORBIDDEN_PATTERNS = (
    re.compile(r"ContextGridManager"),
    re.compile(r"window\.ContextGrid"),
    re.compile(r"createContextGrid"),
    re.compile(r"ColumnSettingsManager"),
    re.compile(r"createColumnSettingsManager"),
    re.compile(r"registerManager"),
    re.compile(r"getManager\b"),
    re.compile(r"window\.cmGridStartUp"),
    re.compile(r"window\[[^\]]*Manager[^\]]*\]"),
    re.compile(r"eval\s*\(\s*opts"),
    re.compile(r"grid_manager_js"),
)

SCAN_DIRS = (
    PACKAGE_ROOT / "templates",
    PACKAGE_ROOT / "static",
)


class LegacyGridHackAuditTests(SimpleTestCase):
    def test_no_legacy_manager_or_contextgrid_patterns_in_templates_and_static(self) -> None:
        violations: list[str] = []
        for root in SCAN_DIRS:
            for path in sorted(root.rglob("*")):
                if not path.is_file():
                    continue
                if path.suffix not in {".html", ".js", ".css"}:
                    continue
                text = path.read_text(encoding="utf-8")
                rel = path.relative_to(PACKAGE_ROOT)
                for pattern in FORBIDDEN_PATTERNS:
                    if pattern.search(text):
                        violations.append(f"{rel}: matched /{pattern.pattern}/")
        self.assertEqual(violations, [])
