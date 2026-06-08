from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Literal

if TYPE_CHECKING:
    from grid_view_spec.types.spec import GridViewSpec

GridViewDiagnosticSeverity = Literal["error", "warning", "info"]


@dataclass(frozen=True, slots=True)
class GridViewDiagnostic:
    severity: GridViewDiagnosticSeverity
    code: str
    path: str = ""
    message: str = ""


@dataclass(frozen=True, slots=True)
class GridViewPolicy:
    allow_template_file: bool = True
    allow_raw_html: bool = False
    allow_trusted_css_vars: bool = False
    strict_unknown_config: bool = False
    registered_renderers: tuple[str, ...] = ()
    registered_validators: tuple[str, ...] = ()


@dataclass(frozen=True, slots=True)
class GridViewResult:
    ok: bool
    spec: GridViewSpec | None = None
    diagnostics: tuple[GridViewDiagnostic, ...] = field(default_factory=tuple)

    @classmethod
    def success(cls, spec: GridViewSpec) -> GridViewResult:
        return cls(ok=True, spec=spec)

    @classmethod
    def failure(
        cls,
        *diagnostics: GridViewDiagnostic,
        spec: GridViewSpec | None = None,
    ) -> GridViewResult:
        return cls(ok=False, spec=spec, diagnostics=diagnostics)
