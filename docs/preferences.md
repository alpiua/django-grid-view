# Saved preferences

django-grid-view stores per-user AG-Grid column presets and saved searches in the `GridPreference` model.

## Model

| Field | Type | Purpose |
|-------|------|---------|
| `user` | FK to `AUTH_USER_MODEL` | Owner |
| `grid_id` | `CharField(100)` | Matches `context.gridId` in grid options |
| `col_presets` | JSON object | Named column layouts |
| `searches` | JSON list | Saved search strings |

Unique together: `(user, grid_id)`.

## Setup

Include app URLs and run migrations (see [Getting started](getting-started.md)):

```bash
python manage.py migrate django_grid_view
```

## Save API

**Endpoint:** `POST /api/django-grid-view/save/`

**Auth:** `login_required` — anonymous users cannot save.

**Body (JSON):**

```json
{
  "grid_id": "products",
  "colPresets": { "default": { "columnState": [] } },
  "searches": ["status:active", "category:books"]
}
```

**Response:** `{"status": "ok"}` or `{"status": "error", "message": "..."}` with HTTP 400.

The bundled `django_grid_view_scripts` tag calls this endpoint when users change column layout or save searches (grid `context.gridId` must match `grid_id`).

## Security notes

- Only authenticated users can write preferences; reads are scoped to `request.user` in the grid manager.
- Validate `grid_id` in your views if you expose grids with sensitive data — the package does not enforce row-level security on saved JSON.
