import json

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import UserProfile


def _user_payload(user: User) -> dict:
    profile = getattr(user, 'profile', None)
    role = profile.role if profile else UserProfile.Role.GUARD
    full_name = user.get_full_name().strip() or user.username
    return {
        'id': str(user.id),
        'username': user.username,
        'role': role,
        'fullName': full_name,
    }


@csrf_exempt
@require_http_methods(['POST'])
def api_login(request):
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
    user = authenticate(request, username=username, password=password)
    if user is None:
        return JsonResponse({'error': 'Invalid credentials'}, status=401)
    profile = getattr(user, 'profile', None)
    actual_role = profile.role if profile else UserProfile.Role.GUARD
    if actual_role != requested_role:
        label_actual = 'SSIO Officer / Administrator' if actual_role == UserProfile.Role.ADMIN else 'Security Guard'
        label_requested = 'SSIO Officer' if requested_role == UserProfile.Role.ADMIN else 'Security Guard'
        return JsonResponse(
            {
                'error': (
                    f'This account is registered as {label_actual}, but you chose {label_requested}. '
                    'Change the sign-in type above to match your role, or use the correct username.'
                )
            },
            status=403,
        )
    login(request, user)
    return JsonResponse(_user_payload(user))


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
    if not profile or profile.role != UserProfile.Role.ADMIN:
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
    return {
        'id': str(u.pk),
        'username': u.username,
        'fullName': full_name,
        'email': u.email or '',
        'dateAdded': date_added,
        'status': status,
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
    if profile:
        profile.role = UserProfile.Role.GUARD
        profile.save(update_fields=['role'])
    else:
        UserProfile.objects.create(user=user, role=UserProfile.Role.GUARD)
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
@require_http_methods(['DELETE'])
def personnel_delete(request, user_id: int):
    err = _require_admin_json(request)
    if err is not None:
        return err
    if request.user.pk == user_id:
        return JsonResponse({'error': 'You cannot delete your own account from this screen'}, status=400)
    try:
        target = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    profile = getattr(target, 'profile', None)
    if not profile or profile.role != UserProfile.Role.GUARD:
        return JsonResponse({'error': 'Only security guard accounts can be removed here'}, status=400)
    target.delete()
    return JsonResponse({'ok': True})
