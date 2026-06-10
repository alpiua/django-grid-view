from django.urls import include, path

urlpatterns = [
    path("", include("grid_view_spec.backends.django.urls")),
]
