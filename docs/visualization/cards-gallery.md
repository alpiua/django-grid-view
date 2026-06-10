# Cards and gallery

## GridViewCards

Card grid layout for non-tabular summaries. Data from host `rows` or resolved in `page_data`.

```python
GridViewCards(
    id="product_cards",
    items=(),  # host-resolved card payloads
    presentation="grid",
)
```

## GridViewGallery / GridViewImage

Image galleries with resolved URLs in spec — image backend is a host builder, never in the spec.

```python
GridViewGallery(
    id="photos",
    images=(
        GridViewImageSource(url="https://…", alt="Product", variants=(...)),
    ),
    lightbox=True,
    datasource=GridViewDataSource(endpoint="/api/gallery/"),  # lazy load
)
```

Lazy gallery: leave `images` empty and set `datasource.endpoint`.

Cell thumbnails in tables: `GridViewColumn(renderer="image", extra={...})`.
