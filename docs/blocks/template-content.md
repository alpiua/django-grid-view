# Template and content blocks

## GridViewTemplate

Host-owned template fragments referenced by id:

```python
GridViewTemplate(
    id="doctor_aside",
    mode="file",  # file | raw (raw requires policy)
    template="dashboard/doctors/_aside.html",
    assets=(GridViewTemplateAsset(kind="script", src="doctor-aside.js"),),
)
```

| Mode | Policy |
|------|--------|
| `file` | Official contract — template path resolved by host |
| `raw` | Trusted HTML only when `GridViewPolicy.allow_raw_html` |

Use for wizards, calculators, and domain UI that does not fit `GridViewForm`.

## GridViewContent

Formula blocks, info callouts, and empty-state messaging inside the layout.

| Role | Use |
|------|-----|
| `text`, `info`, `formula`, `empty`, `warning` | Plain inline body |
| `callout` | In-flow card with tone + optional title |
| `banner` | Full-width notice strip |

Fields: `body`, optional `title`, `tone`, `dismissible`, `extra.initial_hidden` (pseudo-toast).

Full guide: [Content callout and banner](content-callout.md).

## Assets

| Scope | Field |
|-------|-------|
| Page-wide | `GridViewConfig.assets` |
| Table domain | `GridViewTable.assets` (documented exception) |
| Template fragment | `GridViewTemplate.assets` |

Package bundles (column settings, KPI runtime) come from the build manifest — not listed in spec assets.
