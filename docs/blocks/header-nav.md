# Header and navigation

## GridViewHeader

Page or entity identity in the layout (distinct from `GridViewMeta.title` for document chrome).

```python
GridViewHeader(
    id="page_header",
    presentation="entity",  # plain | entity | split | compact | hero
    subtitle="February 2026",
    entity=GridViewEntity(
        id="dept-12",
        title="Cardiology",
        facts=(("Code", "CARD"), ("Head", "Dr. Smith")),
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
