# Forms

## GridViewForm

Declarative forms with typed fields and validators — preferred over bespoke templates for standard input flows.

```python
GridViewForm(
    id="import_form",
    fields=(
        GridViewField(id="file", label="File", type="file", validators=(GridViewValidator(kind="required"),)),
        GridViewField(id="period", label="Period", type="select", options=(...)),
    ),
    submit=GridViewExportAction(format="xlsx", params={"builder": "import_preview"}),
    endpoint="/api/import/preview/",
)
```

| Concept | Rule |
|---------|------|
| Validators | Built-in (`required`, `email`, `min`, …) or registered custom id |
| Bespoke wizards | Use `GridViewTemplate` instead |

Editor types: `text`, `number`, `select`, `date`, `boolean`.
