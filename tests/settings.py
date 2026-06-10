from pathlib import Path

_PKG_ROOT = Path(__file__).resolve().parents[1] / "src"

SECRET_KEY = "grid-view-spec-tests"
USE_TZ = True
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "auth.User"

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.staticfiles",
    "grid_view_spec.backends.django",
]

STATIC_URL = "/static/"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

ROOT_URLCONF = "tests.urls"

LOCALE_PATHS = [str(_PKG_ROOT / "grid_view_spec" / "locale")]

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "APP_DIRS": True,
        "DIRS": [str(_PKG_ROOT / "grid_view_spec" / "templates")],
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
            ],
            "libraries": {
                "grid_view_spec": "grid_view_spec.backends.django.templatetags",
                "static": "django.templatetags.static",
            },
        },
    }
]
