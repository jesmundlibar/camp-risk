"""Bearer token auth for SPA + separate API host (cookies often fail cross-origin)."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core import signing
from django.utils.deprecation import MiddlewareMixin

User = get_user_model()

TOKEN_SALT = 'camp-risk-bearer-v1'
TOKEN_MAX_AGE = 60 * 60 * 24 * 14  # 14 days


def issue_auth_token(user) -> str:
    return signing.dumps({'uid': int(user.pk)}, salt=TOKEN_SALT)


def read_auth_token(raw: str) -> dict | None:
    raw = (raw or '').strip()
    if not raw:
        return None
    try:
        return signing.loads(raw, salt=TOKEN_SALT, max_age=TOKEN_MAX_AGE)
    except signing.BadSignature:
        return None


class BearerAuthMiddleware(MiddlewareMixin):
    """Authenticate via Authorization: Bearer <signed-token> after session auth."""

    def process_request(self, request):
        header = request.META.get('HTTP_AUTHORIZATION', '')
        if not header.startswith('Bearer '):
            return None
        data = read_auth_token(header[7:])
        if not data or 'uid' not in data:
            return None
        try:
            uid = int(data['uid'])
        except (TypeError, ValueError):
            return None
        try:
            user = User.objects.select_related('profile').get(pk=uid, is_active=True)
        except User.DoesNotExist:
            return None
        request.user = user
        return None
