from __future__ import annotations

import json
import os

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .bearer_auth import issue_auth_token
from .models import UserProfile

ADMIN_USERNAME = 'Admin'
ADMIN_PASSWORD = 'Admin@123'
ADMIN_FIRST_NAME = 'Sir'
ADMIN_LAST_NAME = 'Apollo'
ADMIN_EMAIL = 'admin@xu.edu.ph'
EMPLOYEE_EMAIL_SUFFIX = '@xu.edu.ph'
STUDENT_EMAIL_SUFFIX = '@my.xu.edu.ph'

_NON_XU_EMAIL_HELP = (
    'Use an official Xavier employee address ending in @xu.edu.ph only. '
    'Gmail, other providers, and student mail (@my.xu.edu.ph) are not allowed for security personnel.'
)


def _validate_employee_email(email: str) -> str | None:
    """Require official employee @xu.edu.ph; reject @my.xu.edu.ph and all other domains."""
    e = (email or '').strip()
    if not e:
        return 'Official employee email (@xu.edu.ph) is required for guard accounts.'
    lower = e.lower()
    # @my.xu.edu.ph ends with the substring "xu.edu.ph" — reject student mail explicitly first.
    if lower.endswith(STUDENT_EMAIL_SUFFIX):
        return _NON_XU_EMAIL_HELP
    if not lower.endswith(EMPLOYEE_EMAIL_SUFFIX):
        return _NON_XU_EMAIL_HELP
    return None


def _sync_guard_personnel_plain_backup(user: User, raw_password: str) -> None:
    """After a successful password check, store a copy for the SSIO personnel list (legacy rows had no copy)."""
    prof = getattr(user, 'profile', None)
    if not prof or prof.role != UserProfile.Role.GUARD:
        return
    backup = str(raw_password or '')[:256]
    if prof.personnel_plain_password == backup:
        return
    prof.personnel_plain_password = backup
    prof.save(update_fields=['personnel_plain_password'])


def _ensure_fixed_admin_account() -> User:
    admin_user, _ = User.objects.get_or_create(
        username=ADMIN_USERNAME,
        defaults={
            'first_name': ADMIN_FIRST_NAME,
            'last_name': ADMIN_LAST_NAME,
            'email': ADMIN_EMAIL,
            'is_staff': True,
        },
    )
    admin_user.first_name = ADMIN_FIRST_NAME
    admin_user.last_name = ADMIN_LAST_NAME
    admin_user.email = ADMIN_EMAIL
    admin_user.is_staff = True
    admin_user.set_password(ADMIN_PASSWORD)
    admin_user.save(update_fields=['first_name', 'last_name', 'email', 'is_staff', 'password'])
    profile, _ = UserProfile.objects.get_or_create(
        user=admin_user,
        defaults={'role': UserProfile.Role.ADMIN, 'created_by_admin': True},
    )
    profile.role = UserProfile.Role.ADMIN
    profile.created_by_admin = True
    profile.save(update_fields=['role', 'created_by_admin'])
    return admin_user


def _user_payload(user: User, *, include_token: bool = False) -> dict:
    profile = getattr(user, 'profile', None)
    role = profile.role if profile else UserProfile.Role.GUARD
    full_name = user.get_full_name().strip() or user.username
    out = {
        'id': str(user.id),
        'username': user.username,
        'role': role,
        'fullName': full_name,
    }
    if include_token:
        out['authToken'] = issue_auth_token(user)
    return out


@csrf_exempt
@require_http_methods(['POST'])
def api_login(request):
    fixed_admin = _ensure_fixed_admin_account()
    try:
        body = json.loads(request.body.decode() or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    username = (body.get('username') or '').strip()
    password = body.get('password') or ''
    requested_role = (body.get('role') or '').strip()
    if not username or not password:
        return JsonResponse({'error': 'username and password are required'}, status=400)
    if requested_role not in (UserProfile.Role.GUARD, UserProfile.Role.ADMIN):
        return JsonResponse(
            {'error': 'Select whether you are signing in as Security or SSIO before continuing.'},
            status=400,
        )
    if requested_role == UserProfile.Role.ADMIN:
        if username != ADMIN_USERNAME or password != ADMIN_PASSWORD:
            return JsonResponse({'error': 'Invalid credentials'}, status=401)
        user = authenticate(request, username=ADMIN_USERNAME, password=ADMIN_PASSWORD)
        if user is None or user.pk != fixed_admin.pk:
            return JsonResponse({'error': 'Admin account is not available. Please contact support.'}, status=500)
    else:
        if username == ADMIN_USERNAME:
            return JsonResponse({'error': 'Use SSIO Officer / Administrator sign-in for this account.'}, status=403)
        user = authenticate(request, username=username, password=password)
        if user is None:
            try:
                cand = User.objects.get(username__iexact=username)
            except User.DoesNotExist:
                return JsonResponse({'error': 'Invalid credentials'}, status=401)
            prof = getattr(cand, 'profile', None)
            if (
                not cand.is_active
                and prof
                and prof.role == UserProfile.Role.GUARD
                and cand.check_password(password)
            ):
                return JsonResponse(
                    {'error': 'This security account is disabled. Contact SSIO if you need access restored.'},
                    status=403,
                )
            return JsonResponse({'error': 'Invalid credentials'}, status=401)
        profile = getattr(user, 'profile', None)
        actual_role = profile.role if profile else UserProfile.Role.GUARD
        if actual_role != UserProfile.Role.GUARD:
            return JsonResponse({'error': 'Only security guard accounts can use Security Guard sign-in.'}, status=403)
        if not profile or profile.role != UserProfile.Role.GUARD:
            return JsonResponse(
                {'error': 'Guard profile is missing. Contact SSIO to fix this account.'},
                status=403,
            )
        _sync_guard_personnel_plain_backup(user, password)
    login(request, user)
    return JsonResponse(_user_payload(user, include_token=True))


@csrf_exempt
@require_http_methods(['POST'])
def api_logout(request):
    logout(request)
    return JsonResponse({'ok': True})


@require_http_methods(['GET', 'HEAD'])
def api_me(request):
    if not request.user.is_authenticated:
        return JsonResponse({'user': None})
    return JsonResponse({'user': _user_payload(request.user)})


def _require_admin_json(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    profile = getattr(request.user, 'profile', None)
    if (
        not profile
        or profile.role != UserProfile.Role.ADMIN
        or request.user.username != ADMIN_USERNAME
        or not profile.created_by_admin
    ):
        return JsonResponse({'error': 'Admin role required'}, status=403)
    return None


def _serialize_guard_user(u: User) -> dict:
    profile = getattr(u, 'profile', None)
    role = profile.role if profile else UserProfile.Role.GUARD
    if role != UserProfile.Role.GUARD:
        return None
    full_name = u.get_full_name().strip() or u.username
    date_added = u.date_joined.date().isoformat() if u.date_joined else ''
    status = 'Active' if u.is_active else 'Inactive'
    plain = ((profile.personnel_plain_password if profile else None) or '').strip()
    # Dots for list UI; eye toggle reveals passwordPlain when SSIO saved it via Manage Personnel.
    if plain:
        password_display = '\u2022' * min(len(plain), 64)
    else:
        password_display = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' if u.has_usable_password() else '\u2014'
    return {
        'id': str(u.pk),
        'username': u.username,
        'fullName': full_name,
        'email': u.email or '',
        'dateAdded': date_added,
        'status': status,
        'passwordDisplay': password_display,
        'passwordPlain': plain,
    }


@csrf_exempt
@require_http_methods(['GET', 'HEAD', 'POST'])
def personnel_list_create(request):
    err = _require_admin_json(request)
    if err is not None:
        return err
    if request.method in ('GET', 'HEAD'):
        rows = []
        for u in User.objects.filter(profile__role=UserProfile.Role.GUARD).order_by('username'):
            row = _serialize_guard_user(u)
            if row:
                rows.append(row)
        return JsonResponse({'personnel': rows})

    try:
        body = json.loads(request.body.decode() or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    username = (body.get('username') or '').strip()
    password = body.get('password') or ''
    full_name = (body.get('fullName') or body.get('full_name') or '').strip()
    email = (body.get('email') or '').strip()
    if not username or not password or not full_name:
        return JsonResponse({'error': 'username, password, and fullName are required'}, status=400)
    email_err = _validate_employee_email(email)
    if email_err:
        return JsonResponse({'error': email_err}, status=400)
    if User.objects.filter(username__iexact=username).exists():
        return JsonResponse({'error': 'That username is already taken'}, status=400)
    first, last = _split_full_name(full_name)
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first[:150],
        last_name=last[:150],
    )
    profile = getattr(user, 'profile', None)
    plain_backup = str(password)[:256]
    if profile:
        profile.role = UserProfile.Role.GUARD
        profile.created_by_admin = True
        profile.personnel_plain_password = plain_backup
        profile.save(update_fields=['role', 'created_by_admin', 'personnel_plain_password'])
    else:
        UserProfile.objects.create(
            user=user,
            role=UserProfile.Role.GUARD,
            created_by_admin=True,
            personnel_plain_password=plain_backup,
        )
    row = _serialize_guard_user(user)
    return JsonResponse(row, status=201)


def _split_full_name(full: str) -> tuple[str, str]:
    full = (full or '').strip()
    if not full:
        return '', ''
    parts = full.split(None, 1)
    if len(parts) == 1:
        return parts[0][:150], ''
    return parts[0][:150], parts[1][:150]


@csrf_exempt
@require_http_methods(['DELETE', 'PATCH'])
def personnel_detail(request, user_id: int):
    err = _require_admin_json(request)
    if err is not None:
        return err
    try:
        target = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    profile = getattr(target, 'profile', None)
    if not profile or profile.role != UserProfile.Role.GUARD:
        return JsonResponse({'error': 'Only security guard accounts can be managed here'}, status=400)

    if request.method == 'PATCH':
        try:
            body = json.loads(request.body.decode() or '{}')
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        touches_profile = any(k in body for k in ('username', 'fullName', 'full_name', 'email'))
        if touches_profile:
            pwd_req = str(body.get('password') or '').strip()
            if len(pwd_req) < 8:
                return JsonResponse(
                    {
                        'error': 'New password is required (at least 8 characters) when saving profile changes.',
                    },
                    status=400,
                )

        changed = False

        if 'active' in body or 'isActive' in body:
            active = body['active'] if 'active' in body else body.get('isActive')
            if not isinstance(active, bool):
                return JsonResponse({'error': 'Provide a boolean "active" field when updating status'}, status=400)
            target.is_active = active
            changed = True

        if 'username' in body:
            username = str(body.get('username') or '').strip()
            if not username:
                return JsonResponse({'error': 'Username cannot be empty'}, status=400)
            if User.objects.filter(username__iexact=username).exclude(pk=target.pk).exists():
                return JsonResponse({'error': 'That username is already taken'}, status=400)
            target.username = username
            changed = True

        if 'fullName' in body or 'full_name' in body:
            full_name = str(body.get('fullName') or body.get('full_name') or '').strip()
            if not full_name:
                return JsonResponse({'error': 'Full name cannot be empty'}, status=400)
            first, last = _split_full_name(full_name)
            target.first_name = first[:150]
            target.last_name = last[:150]
            changed = True

        if 'email' in body:
            email = str(body.get('email') or '').strip()
            email_err = _validate_employee_email(email)
            if email_err:
                return JsonResponse({'error': email_err}, status=400)
            target.email = email
            changed = True

        if 'password' in body:
            password = str(body.get('password') or '').strip()
            if password:
                if len(password) < 8:
                    return JsonResponse({'error': 'Password must be at least 8 characters'}, status=400)
                target.set_password(password)
                profile.personnel_plain_password = password[:256]
                profile.save(update_fields=['personnel_plain_password'])
                changed = True

        if not changed:
            return JsonResponse({'error': 'No updates provided'}, status=400)

        target.save()
        row = _serialize_guard_user(target)
        return JsonResponse(row)

    # DELETE
    if request.user.pk == user_id:
        return JsonResponse({'error': 'You cannot delete your own account from this screen'}, status=400)
    target.delete()
    return JsonResponse({'ok': True})


@require_http_methods(['GET', 'HEAD'])
def api_google_sheets_backup_info(request):
    """Return whether automated backup is on and a browser URL for admins to open the spreadsheet."""
    err = _require_admin_json(request)
    if err is not None:
        return err
    sid = (os.environ.get('GOOGLE_SHEETS_SPREADSHEET_ID') or '').strip()
    backup_enabled = (
        os.environ.get('GOOGLE_SHEETS_BACKUP_ENABLED', '').strip().lower() in ('1', 'true', 'yes') and bool(sid)
    )
    browser_url = (os.environ.get('GOOGLE_SHEETS_BROWSER_URL') or '').strip()
    view_url = browser_url or (f'https://docs.google.com/spreadsheets/d/{sid}/edit' if sid else '')
    return JsonResponse(
        {
            'backup_enabled': backup_enabled,
            'configured': bool(view_url),
            'view_url': view_url or None,
        }
    )
