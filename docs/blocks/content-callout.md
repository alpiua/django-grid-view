# Content callout and banner

Semantic info blocks extend **`GridViewContent`** with roles **`callout`** and **`banner`**. Tone
uses **`GridViewSemanticTone`**: `default | info | success | warning | danger`. Wire aliases
`error` → `danger` and `warn` → `warning` normalize on ingest.

## Callout (in-flow)

```python
GridViewContent(
    id="finances_empty",
    role="callout",
    tone="success",
    title="✅",
    body="Фінансові дані заповнені…",
)
```

Renders: `cm-callout cm-tone-{tone}` with left accent border.

## Banner (full-width strip)

```python
GridViewContent(
    id="page_notice",
    role="banner",
    tone="info",
    body="Maintenance window tonight.",
)
```

Renders: `cm-banner cm-tone-{tone}` at area width.

## Dismissible callouts

```python
GridViewContent(
    id="hint",
    role="callout",
    tone="info",
    body="…",
    dismissible=True,
)
```

Close button persists dismiss in `sessionStorage` under `cm-dismiss-{id}`.

## Pseudo-toast (variant A)

Not a floating toast stack — a hidden callout revealed by action:

```python
GridViewContent(
    id="save_hint",
    role="callout",
    tone="info",
    body="Зміни не збережені.",
    extra={"initial_hidden": True},
)

GridViewButtonAction(
    id="validate_btn",
    label="Validate",
    action="show_content",
    target="save_hint",
    params={"auto_hide_ms": 4000},
)
```

Runtime: `initContentActions` in unified `bootScope` (HTMX-safe).

MCP fixture: `gridview_examples(case="semantic_ui")`.

See [maintainers architecture — semantic UI](../maintainers/gridviewspec-architecture.md#semantic-ui-tones-callouts-actions).
