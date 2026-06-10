# Column settings

```python
GridViewTable(
    settings=GridViewTableSettings(
        columns=True,
        order=True,
        visibility=True,
        pinning=True,
        sizing=True,
        presets=True,
    ),
)
```

When `settings` is set, the table renderer shows the gear control and column settings modal.

## Features

| Feature | Behavior |
|---------|----------|
| Drag reorder | SortableJS (host base template CDN) |
| Show/hide | Per column or column group |
| Pin L/R | Standalone columns |
| Named presets | `GridPreference.col_presets` |
| Session state | `localStorage` per `grid_id` |

Simple table and AG-Grid share the same modal (`GridView.createColumnSettings`).

Custom placement: `GridViewButtonAction(action="table_settings", target="table_id")`.

## Persistence layers

| Layer | Storage |
|-------|---------|
| Session | `localStorage` — column layout, filters, quick search |
| Named presets | `GridPreference` via `POST api_grid_preferences` |

See [Preferences](../persistence/preferences.md).
