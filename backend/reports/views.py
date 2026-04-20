import json
from datetime import datetime

from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import IncidentReport


def _priority_from_hazards(hazard_types: list) -> str:
    high = {'Fire Hazard', 'Chemical Spill', 'Electrical Fault', 'Structural Damage'}
    if any(h in high for h in (hazard_types or [])):
        return 'High'
    return 'Medium'


def _serialize(r: IncidentReport, request) -> dict:
    created: datetime = r.created_at
    if timezone.is_naive(created):
        created = timezone.make_aware(created, timezone.get_current_timezone())
    local = timezone.localtime(created)
    time_str = local.strftime('%I:%M %p').lstrip('0')
    photo_url = r.photo.url if r.photo else None
    return {
        'id': r.public_id(),
        'hazard': r.hazard_summary(),
        'hazard_types': list(r.hazard_types or []),
        'date': local.date().isoformat(),
        'time': time_str,
        'status': r.get_status_display(),
        'status_code': r.status,
        'priority': r.priority,
        'location': r.location_line(),
        'guard': r.submitted_by_name,
        'description': r.description or '',
        'submitted_by': r.submitted_by_name,
        'building': r.building,
        'floor': r.floor,
        'room': r.room,
        'specific_location': r.specific_location or '',
        'other_hazard': r.other_hazard or '',
        'photo_url': photo_url,
        'created_at': r.created_at.isoformat(),
    }


def _parse_report_pk(report_id: str) -> int:
    s = (report_id or '').strip()
    if s.upper().startswith('RPT-'):
        s = s[4:]
    return int(s)


@csrf_exempt
@require_http_methods(['GET', 'HEAD', 'POST'])
def report_list_create(request):
    if request.method in ('GET', 'HEAD'):
        qs = IncidentReport.objects.all()
        user_id = request.GET.get('submitted_by_user_id')
        status = request.GET.get('status')
        if user_id:
            qs = qs.filter(submitted_by_user_id=user_id)
        if status:
            qs = qs.filter(status=status)
        data = [_serialize(r, request) for r in qs[:500]]
        return JsonResponse({'reports': data})

    # POST — multipart (browser) or JSON
    submitted_by_user_id = ''
    submitted_by_name = ''
    hazard_types: list = []
    other_hazard = ''
    building = ''
    floor = ''
    room = ''
    specific_location = ''
    description = ''
    photo = None

    if request.content_type and 'multipart/form-data' in request.content_type:
        submitted_by_user_id = (request.POST.get('submitted_by_user_id') or '').strip()
        submitted_by_name = (request.POST.get('submitted_by_name') or '').strip()
        ht = request.POST.get('hazard_types') or '[]'
        try:
            hazard_types = json.loads(ht) if isinstance(ht, str) else []
        except json.JSONDecodeError:
            hazard_types = []
        other_hazard = (request.POST.get('other_hazard') or '').strip()
        building = (request.POST.get('building') or '').strip()
        floor = (request.POST.get('floor') or '').strip()
        room = (request.POST.get('room') or '').strip()
        specific_location = (request.POST.get('specific_location') or '').strip()
        description = (request.POST.get('description') or '').strip()
        photo = request.FILES.get('photo')
    else:
        try:
            body = json.loads(request.body.decode() or '{}')
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        submitted_by_user_id = (body.get('submitted_by_user_id') or '').strip()
        submitted_by_name = (body.get('submitted_by_name') or '').strip()
        hazard_types = body.get('hazard_types') or []
        if not isinstance(hazard_types, list):
            hazard_types = []
        other_hazard = (body.get('other_hazard') or '').strip()
        building = (body.get('building') or '').strip()
        floor = (body.get('floor') or '').strip()
        room = (body.get('room') or '').strip()
        specific_location = (body.get('specific_location') or '').strip()
        description = (body.get('description') or '').strip()

    if not submitted_by_user_id or not submitted_by_name:
        return JsonResponse(
            {'error': 'submitted_by_user_id and submitted_by_name are required'},
            status=400,
        )
    if not building or not floor or not room:
        return JsonResponse({'error': 'building, floor, and room are required'}, status=400)
    if not hazard_types:
        return JsonResponse({'error': 'Select at least one hazard type'}, status=400)

    priority = _priority_from_hazards(hazard_types)
    report = IncidentReport(
        submitted_by_user_id=submitted_by_user_id,
        submitted_by_name=submitted_by_name,
        hazard_types=hazard_types,
        other_hazard=other_hazard,
        building=building,
        floor=floor,
        room=room,
        specific_location=specific_location,
        description=description,
        priority=priority,
    )
    if photo:
        report.photo = photo
    report.save()
    return JsonResponse(_serialize(report, request), status=201)


@csrf_exempt
@require_http_methods(['GET', 'HEAD'])
def report_detail(request, report_id: str):
    try:
        pk = _parse_report_pk(report_id)
    except ValueError:
        return JsonResponse({'error': 'Invalid report id'}, status=400)
    try:
        r = IncidentReport.objects.get(pk=pk)
    except IncidentReport.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    return JsonResponse(_serialize(r, request))
