# Forms

## GridViewForm

Declarative forms with typed fields and validators — preferred over bespoke templates for standard input flows.

```python
GridViewForm(
    id="import_form",
    fields=(
        GridViewField(name="file", label="File", type="file", validators=(GridViewValidator(kind="required"),)),
        GridViewField(name="period", label="Period", type="select", options=(...)),
    ),
    submit=GridViewExportAction(format="xlsx", params={"builder": "import_preview"}),
    endpoint="/api/import/preview/",
)
```

| Concept | Rule |
|---------|------|
| Validators | Built-in (`required`, `email`, `min`, …) or registered custom id |
| Bespoke wizards | Use `GridViewTemplate` instead |

Editor types: `text`, `textarea`, `number`, `select`, `multiselect`, `date`, `date_range`, `boolean`, `file`.
