"""Rate limiting for server-side exports."""

from __future__ import annotations

import time
from collections.abc import Callable
from functools import wraps
from typing import TypedDict

from django.core.cache import cache
from django.http import HttpRequest, HttpResponse, HttpResponseBase
from django.views import View

from django_grid_view.types.json import as_str_object_dict

DecoratedView = Callable[..., HttpResponseBase]


class _ThrottleBucket(TypedDict):
    count: int
    start: float


def _bucket_from_cache(bucket_key: str) -> _ThrottleBucket:
    raw = cache.get(bucket_key)
    mapped = as_str_object_dict(raw) if raw is not None else {}
    count = mapped.get("count")
    start = mapped.get("start")
    if isinstance(count, int) and isinstance(start, (int, float)):
        return _ThrottleBucket(count=count, start=float(start))
    return _ThrottleBucket(count=0, start=time.time())


def _request_from_args(args: tuple[object, ...]) -> HttpRequest:
    if not args:
        msg = "view requires HttpRequest as the first positional argument"
        raise TypeError(msg)
    request = args[0]
    if not isinstance(request, HttpRequest):
        msg = "first positional argument must be HttpRequest"
        raise TypeError(msg)
    return request


def _check_and_increment(
    bucket_key: str,
    *,
    max_requests: int,
    window_seconds: int,
) -> HttpResponse | None:
    data = _bucket_from_cache(bucket_key)
    now = time.time()
    if now - data["start"] > window_seconds:
        data = _ThrottleBucket(count=0, start=now)
    if data["count"] >= max_requests:
        return HttpResponse("Too many export requests", status=429)
    data["count"] += 1
    cache.set(bucket_key, data, timeout=window_seconds)
    return None


def export_throttle(
    *,
    max_requests: int = 5,
    window_seconds: int = 60,
    key_fn: Callable[[HttpRequest], str] | None = None,
) -> Callable[[DecoratedView], DecoratedView]:
    def decorator(view: DecoratedView) -> DecoratedView:
        @wraps(view)
        def wrapped(*args: object, **kwargs: object) -> HttpResponseBase:
            request = _request_from_args(args)
            if key_fn:
                key = key_fn(request)
            else:
                uid = getattr(request.user, "pk", "anon")
                key = f"export:{uid}:{request.path}"
            bucket_key = f"export_throttle:{key}"
            blocked = _check_and_increment(
                bucket_key,
                max_requests=max_requests,
                window_seconds=window_seconds,
            )
            if blocked is not None:
                return blocked
            return view(*args, **kwargs)

        return wrapped

    return decorator


class ExportThrottleMixin(View):
    export_rate_limit_max = 5
    export_rate_limit_window = 60

    def dispatch(
        self,
        request: HttpRequest,
        *args: object,
        **kwargs: object,
    ) -> HttpResponseBase:
        uid = getattr(request.user, "pk", "anon")
        key = f"export:{uid}:{request.path}"
        bucket_key = f"export_throttle:{key}"
        blocked = _check_and_increment(
            bucket_key,
            max_requests=self.export_rate_limit_max,
            window_seconds=self.export_rate_limit_window,
        )
        if blocked is not None:
            return blocked
        return super().dispatch(request, *args, **kwargs)
