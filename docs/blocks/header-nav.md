# Header and navigation

## GridViewHeader

Page or entity identity in the layout (distinct from `GridViewMeta.title` for document chrome).

```python
from grid_view_spec.types.header import GridViewFact, GridViewEntity, GridViewHeader

GridViewHeader(
    id="page_header",
    presentation="entity",  # plain | entity | split | compact | hero
    subtitle="February 2026",
    entity=GridViewEntity(
        id="dept-12",
        title="Cardiology",
        facts=(
            GridViewFact(label="Code", value="CARD"),
            GridViewFact(label="Head", value="Dr. Smith"),
        ),
    ),
    nav="main_nav",
    actions="header_actions",
)
```

| Field | Role |
|-------|------|
| `entity` | Simple label/value pairs for entity pages |
| `content` | Block id of `GridViewTemplate` for complex aside HTML |
| `nav` | Block id of `GridViewNav` |
| `actions` | Block id of `GridViewActions` |

## GridViewNav

Breadcrumbs, back links, and section navigation. Referenced from header or placed in layout.
