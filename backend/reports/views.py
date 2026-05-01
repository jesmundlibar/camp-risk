import json
import re
from datetime import date
from datetime import datetime
from io import BytesIO
from typing import Optional, Tuple
from xml.sax.saxutils import escape

from django.db.models import Count, Prefetch
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from accounts.models import UserProfile

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .models import IncidentReport, InformationRequest, ReportStatusHistory, RiskAssessment


def _user_role(user) -> Optional[str]:
    if not user.is_authenticated:
        return None
    profile = getattr(user, 'profile', None)
    if profile:
        return profile.role
    return UserProfile.Role.GUARD


def _is_admin(user) -> bool:
    return _user_role(user) == UserProfile.Role.ADMIN


def _priority_from_hazards(hazard_types: list) -> str:
    high = {
        'Earthquake Hazard',
        'Fire in Campus Buildings',
        'Laboratory Chemical Exposure',
        'Biological Hazard Exposure',
        'Campus Security Incident',
        'Traffic and Vehicle Congestion',
        # Keep legacy labels to preserve old behavior for existing reports.
        'Fire Hazard',
        'Chemical Spill',
        'Security Incident',
    }
    medium = {
        'Flooding',
        'Electrical Hazards',
        'Emergency Evacuation Failure',
        # Keep legacy labels to preserve old behavior for existing reports.
        'Electrical Fault',
        'Structural Damage',
    }
    hazards = set(hazard_types or [])
    if hazards & high:
        return 'High'
    if hazards & medium:
        return 'Medium'
    return 'Low'


def _risk_level_from_score(score: int) -> str:
    # Client rubric: 0-11 Low, 12-19 Medium, 20-25 High.
    if score >= 20:
        return 'High Risk'
    if score >= 12:
        return 'Medium Risk'
    if score > 0:
        return 'Low Risk'
    return ''


def _serialize_assessment(ra: RiskAssessment) -> dict:
    return {
        'risk_classification': ra.risk_classification,
        'likelihood': ra.likelihood,
        'severity': ra.severity,
        'risk_score': ra.risk_score,
        'risk_level': ra.risk_level,
        'engineering_controls': ra.engineering_controls,
        'administrative_controls': ra.administrative_controls,
        'ppe_controls': ra.ppe_controls,
        'residual_risk': ra.residual_risk,
        'mitigation_actions': ra.mitigation_actions or [],
        'updated_at': ra.updated_at.isoformat(),
    }


def _serialize_information_requests(report: IncidentReport) -> list:
    rows = []
    for ir in report.information_requests.all()[:25]:
        created = ir.created_at
        if timezone.is_naive(created):
            created = timezone.make_aware(created, timezone.get_current_timezone())
        rows.append(
            {
                'id': ir.pk,
                'created_at': timezone.localtime(created).isoformat(),
                'payload': ir.payload,
            }
        )
    return rows


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
        'information_request_count': getattr(r, 'information_request_count', 0),
    }


def _parse_report_pk(report_id: str) -> int:
    s = (report_id or '').strip()
    if s.upper().startswith('RPT-'):
        s = s[4:]
    return int(s)


_ACTION_REF_RE = re.compile(r'^RPT-(\d+)-A(\d+)$', re.IGNORECASE)


def _parse_mitigation_action_ref(action_ref: str) -> Optional[Tuple[int, int]]:
    """Return (report_pk, 1-based action index) for strings like RPT-12-A1."""
    m = _ACTION_REF_RE.match((action_ref or '').strip())
    if not m:
        return None
    return int(m.group(1)), int(m.group(2))


def _append_history(report: IncidentReport, from_status: str, to_status: str, user, note: str = '') -> None:
    ReportStatusHistory.objects.create(
        report=report,
        from_status=from_status,
        to_status=to_status,
        changed_by=user if user.is_authenticated else None,
        note=note,
    )


@csrf_exempt
@require_http_methods(['GET', 'HEAD', 'POST'])
def report_list_create(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)

    if request.method in ('GET', 'HEAD'):
        qs = IncidentReport.objects.all()
        if not _is_admin(request.user):
            qs = qs.filter(submitted_by_user_id=str(request.user.id))
        else:
            user_id = request.GET.get('submitted_by_user_id')
            status = request.GET.get('status')
            if user_id:
                qs = qs.filter(submitted_by_user_id=user_id)
            if status:
                qs = qs.filter(status=status)
        qs = qs.annotate(information_request_count=Count('information_requests'))
        data = [_serialize(r, request) for r in qs[:500]]
        return JsonResponse({'reports': data})

    # POST — multipart (browser) or JSON
    submitted_by_user_id = str(request.user.id)
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
        submitted_by_name = (request.POST.get('submitted_by_name') or '').strip() or request.user.get_full_name().strip() or request.user.username
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
        submitted_by_name = (body.get('submitted_by_name') or '').strip() or request.user.get_full_name().strip() or request.user.username
        hazard_types = body.get('hazard_types') or []
        if not isinstance(hazard_types, list):
            hazard_types = []
        other_hazard = (body.get('other_hazard') or '').strip()
        building = (body.get('building') or '').strip()
        floor = (body.get('floor') or '').strip()
        room = (body.get('room') or '').strip()
        specific_location = (body.get('specific_location') or '').strip()
        description = (body.get('description') or '').strip()

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
    _append_history(report, '', IncidentReport.Status.PENDING, request.user, 'Report created')
    return JsonResponse(_serialize(report, request), status=201)


@csrf_exempt
@require_http_methods(['POST'])
def report_guard_update(request, report_id: str):
    """Allow the submitting guard to revise a report while it is still Pending.

    Uses POST (not PATCH) because Django only parses multipart/form-data into
    request.POST / request.FILES for POST requests.
    """
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    if _is_admin(request.user):
        return JsonResponse({'error': 'Admins cannot use this endpoint'}, status=403)
    try:
        pk = _parse_report_pk(report_id)
    except ValueError:
        return JsonResponse({'error': 'Invalid report id'}, status=400)
    try:
        report = IncidentReport.objects.get(pk=pk)
    except IncidentReport.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    if report.submitted_by_user_id != str(request.user.id):
        return JsonResponse({'error': 'Forbidden'}, status=403)
    if report.status != IncidentReport.Status.PENDING:
        return JsonResponse(
            {
                'error': 'You can only update reports that are still Pending (not yet assessed or closed).',
            },
            status=400,
        )

    if not request.content_type or 'multipart/form-data' not in request.content_type:
        return JsonResponse({'error': 'Use multipart form data (same fields as a new report)'}, status=400)

    submitted_by_name = (request.POST.get('submitted_by_name') or '').strip() or request.user.get_full_name().strip() or request.user.username
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

    if not building or not floor or not room:
        return JsonResponse({'error': 'building, floor, and room are required'}, status=400)
    if not hazard_types:
        return JsonResponse({'error': 'Select at least one hazard type'}, status=400)

    old_status = report.status
    report.submitted_by_name = submitted_by_name
    report.hazard_types = hazard_types
    report.other_hazard = other_hazard
    report.building = building
    report.floor = floor
    report.room = room
    report.specific_location = specific_location
    report.description = description
    report.priority = _priority_from_hazards(hazard_types)
    if photo:
        report.photo = photo
    report.save()
    _append_history(
        report,
        old_status,
        IncidentReport.Status.PENDING,
        request.user,
        'Guard updated report details',
    )
    return JsonResponse(_serialize(report, request))


@csrf_exempt
@require_http_methods(['GET', 'HEAD'])
def report_detail(request, report_id: str):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    try:
        pk = _parse_report_pk(report_id)
    except ValueError:
        return JsonResponse({'error': 'Invalid report id'}, status=400)
    try:
        r = (
            IncidentReport.objects.select_related('risk_assessment')
            .prefetch_related(
                Prefetch(
                    'information_requests',
                    queryset=InformationRequest.objects.order_by('-created_at'),
                )
            )
            .get(pk=pk)
        )
    except IncidentReport.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    if not _is_admin(request.user):
        if r.submitted_by_user_id != str(request.user.id):
            return JsonResponse({'error': 'Forbidden'}, status=403)
    data = _serialize(r, request)
    data['information_request_count'] = len(r.information_requests.all())
    try:
        ra = r.risk_assessment
        data['assessment'] = _serialize_assessment(ra)
    except RiskAssessment.DoesNotExist:
        data['assessment'] = None
    data['information_requests'] = _serialize_information_requests(r)
    return JsonResponse(data)


@csrf_exempt
@require_http_methods(['POST'])
def report_assessment_upsert(request, report_id: str):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    if not _is_admin(request.user):
        return JsonResponse({'error': 'Admin role required'}, status=403)
    try:
        pk = _parse_report_pk(report_id)
    except ValueError:
        return JsonResponse({'error': 'Invalid report id'}, status=400)
    try:
        report = IncidentReport.objects.get(pk=pk)
    except IncidentReport.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    try:
        body = json.loads(request.body.decode() or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    likelihood = body.get('likelihood')
    severity = body.get('severity')
    try:
        li = int(likelihood)
        se = int(severity)
    except (TypeError, ValueError):
        return JsonResponse({'error': 'likelihood and severity must be integers 1-5'}, status=400)
    if not (1 <= li <= 5 and 1 <= se <= 5):
        return JsonResponse({'error': 'likelihood and severity must be between 1 and 5'}, status=400)

    risk_score = li * se
    risk_level = _risk_level_from_score(risk_score)
    risk_classification = (body.get('risk_classification') or '').strip()
    engineering = (body.get('engineering_controls') or '').strip()
    administrative = (body.get('administrative_controls') or '').strip()
    ppe = (body.get('ppe_controls') or body.get('ppe') or '').strip()
    residual = (body.get('residual_risk') or '').strip()
    mitigation_actions = body.get('mitigation_actions')
    if mitigation_actions is None:
        mitigation_actions = []
    if not isinstance(mitigation_actions, list):
        return JsonResponse({'error': 'mitigation_actions must be a list'}, status=400)

    if not risk_classification:
        return JsonResponse({'error': 'Risk classification is required'}, status=400)
    if not engineering:
        return JsonResponse({'error': 'Engineering control measure is required'}, status=400)
    if not administrative:
        return JsonResponse({'error': 'Administrative control measure is required'}, status=400)
    if not ppe:
        return JsonResponse({'error': 'PPE control measure is required'}, status=400)
    if not residual:
        return JsonResponse({'error': 'Residual risk is required'}, status=400)

    try:
        existing_ra = report.risk_assessment
        old_action_rows = list(existing_ra.mitigation_actions or [])
    except RiskAssessment.DoesNotExist:
        old_action_rows = []

    normalized_actions: list = []
    for item in mitigation_actions:
        if not isinstance(item, dict):
            continue
        desc = (item.get('description') or '').strip()
        due = (item.get('due_date') or item.get('dueDate') or '').strip()
        if not desc and not due:
            continue
        normalized_actions.append({'description': desc, 'due_date': due})
    complete = [a for a in normalized_actions if a['description'] and a['due_date']]
    if not complete:
        return JsonResponse(
            {'error': 'At least one mitigation action with both description and due date is required'},
            status=400,
        )
    incomplete = [a for a in normalized_actions if not (a['description'] and a['due_date'])]
    if incomplete:
        return JsonResponse(
            {'error': 'Each mitigation action row must include both description and due date'},
            status=400,
        )
    merged_actions: list = []
    for i, row in enumerate(complete):
        merged = dict(row)
        if i < len(old_action_rows) and isinstance(old_action_rows[i], dict):
            for k, v in old_action_rows[i].items():
                if k not in ('description', 'due_date'):
                    merged[k] = v
        merged_actions.append(merged)
    mitigation_actions = merged_actions

    old_status = report.status
    RiskAssessment.objects.update_or_create(
        report=report,
        defaults={
            'risk_classification': risk_classification,
            'likelihood': li,
            'severity': se,
            'risk_score': risk_score,
            'risk_level': risk_level,
            'engineering_controls': engineering,
            'administrative_controls': administrative,
            'ppe_controls': ppe,
            'residual_risk': residual,
            'mitigation_actions': mitigation_actions,
            'assessed_by': request.user,
        },
    )
    report.status = IncidentReport.Status.ASSESSED
    report.save(update_fields=['status'])
    _append_history(report, old_status, IncidentReport.Status.ASSESSED, request.user, 'Risk assessment submitted')

    ra = report.risk_assessment
    return JsonResponse(
        {
            'ok': True,
            'report_id': report.public_id(),
            'risk_score': ra.risk_score,
            'risk_level': ra.risk_level,
            'status_code': report.status,
        },
        status=200,
    )


@csrf_exempt
@require_http_methods(['POST'])
def report_request_information(request, report_id: str):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    if not _is_admin(request.user):
        return JsonResponse({'error': 'Admin role required'}, status=403)
    try:
        pk = _parse_report_pk(report_id)
    except ValueError:
        return JsonResponse({'error': 'Invalid report id'}, status=400)
    try:
        report = IncidentReport.objects.get(pk=pk)
    except IncidentReport.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    try:
        body = json.loads(request.body.decode() or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    qs = (body.get('specificQuestions') or '').strip()
    if not qs:
        return JsonResponse({'error': 'Specific questions are required'}, status=400)

    payload = {
        'requestType': body.get('requestType') or 'clarification',
        'specificQuestions': qs,
        'additionalPhotos': bool(body.get('additionalPhotos')),
        'measurements': bool(body.get('measurements')),
        'witnessStatements': bool(body.get('witnessStatements')),
        'otherInfo': (body.get('otherInfo') or '').strip(),
        'urgency': body.get('urgency') or 'normal',
    }
    ir = InformationRequest.objects.create(
        report=report,
        created_by=request.user,
        payload=payload,
    )
    submitter = report.submitted_by_name or report.submitted_by_user_id
    _append_history(
        report,
        report.status,
        report.status,
        request.user,
        note=f'Information request #{ir.pk} sent to {submitter}',
    )
    return JsonResponse(
        {
            'ok': True,
            'id': ir.pk,
            'report_id': report.public_id(),
            'message': (
                f'Request saved on {report.public_id()}. It is stored on this report and visible to '
                f'administrators and to the submitting guard ({submitter}) in their report details.'
            ),
        },
        status=201,
    )


@csrf_exempt
@require_http_methods(['POST'])
def report_extend_deadline(request, report_id: str):
    """Extend due date of a mitigation action by report ID."""
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    if not _is_admin(request.user):
        return JsonResponse({'error': 'Admin role required'}, status=403)
    try:
        pk = _parse_report_pk(report_id)
    except ValueError:
        return JsonResponse({'error': 'Invalid report id'}, status=400)
    try:
        report = IncidentReport.objects.select_related('risk_assessment').get(pk=pk)
    except IncidentReport.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    try:
        ra = report.risk_assessment
    except RiskAssessment.DoesNotExist:
        return JsonResponse({'error': 'No risk assessment for this report'}, status=404)

    try:
        body = json.loads(request.body.decode() or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    new_raw = (body.get('new_due_date') or body.get('newDueDate') or '').strip()
    if not new_raw:
        return JsonResponse({'error': 'new_due_date is required'}, status=400)
    try:
        new_due = str(date.fromisoformat(str(new_raw)[:10]))
    except ValueError:
        return JsonResponse({'error': 'new_due_date must be a valid ISO date (YYYY-MM-DD)'}, status=400)

    idx_raw = body.get('action_index') or body.get('actionIndex') or 1
    try:
        action_1based = int(idx_raw)
    except (TypeError, ValueError):
        return JsonResponse({'error': 'action_index must be an integer'}, status=400)
    if action_1based < 1:
        return JsonResponse({'error': 'action_index must be at least 1'}, status=400)
    idx = action_1based - 1

    actions = list(ra.mitigation_actions or [])
    if not (0 <= idx < len(actions)) or not isinstance(actions[idx], dict):
        return JsonResponse({'error': 'Mitigation action not found'}, status=404)

    row = dict(actions[idx])
    old_due = (row.get('due_date') or row.get('dueDate') or '')[:32]
    row['due_date'] = new_due
    ext_log = row.get('extension_log')
    if not isinstance(ext_log, list):
        ext_log = []
    ext_log.append(
        {
            'previous_due': old_due,
            'new_due': new_due,
            'reason': ((body.get('extension_reason') or body.get('extensionReason') or '').strip())[:128],
            'justification': ((body.get('justification') or '').strip())[:2000],
            'notify_team': bool(body.get('notify_team', body.get('notifyTeam', True))),
            'changed_by': request.user.get_username(),
        }
    )
    row['extension_log'] = ext_log[-25:]
    actions[idx] = row
    ra.mitigation_actions = actions
    ra.save(update_fields=['mitigation_actions', 'updated_at'])

    ref = f'{report.public_id()}-A{action_1based}'
    _append_history(
        report,
        report.status,
        report.status,
        request.user,
        note=f'Deadline extended for mitigation {ref} to {new_due}',
    )
    return JsonResponse(
        {
            'ok': True,
            'action_ref': ref,
            'new_due_date': new_due,
            'message': f'Deadline updated to {new_due} for {ref}.',
        },
        status=200,
    )


@csrf_exempt
@require_http_methods(['PATCH'])
def report_mitigation_update(request, report_id: str):
    """Patch tracking fields of the first mitigation action after assessment."""
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    if not _is_admin(request.user):
        return JsonResponse({'error': 'Admin role required'}, status=403)
    try:
        pk = _parse_report_pk(report_id)
    except ValueError:
        return JsonResponse({'error': 'Invalid report id'}, status=400)
    try:
        report = IncidentReport.objects.select_related('risk_assessment').get(pk=pk)
    except IncidentReport.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    try:
        ra = report.risk_assessment
    except RiskAssessment.DoesNotExist:
        return JsonResponse({'error': 'No risk assessment for this report'}, status=404)

    try:
        body = json.loads(request.body.decode() or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    actions = list(ra.mitigation_actions or [])
    if not actions:
        return JsonResponse({'error': 'No mitigation actions on this assessment'}, status=400)
    if not isinstance(actions[0], dict):
        return JsonResponse({'error': 'Invalid mitigation_actions data'}, status=400)

    row = dict(actions[0])
    if 'mitigation_plan' in body or 'mitigationPlan' in body:
        plan = (body.get('mitigation_plan') or body.get('mitigationPlan') or '').strip()
        if not plan:
            return JsonResponse({'error': 'mitigation_plan cannot be empty'}, status=400)
        row['description'] = plan

    if 'due_date' in body or 'dueDate' in body:
        due_raw = (body.get('due_date') or body.get('dueDate') or '').strip()
        if not due_raw:
            return JsonResponse({'error': 'due_date cannot be empty'}, status=400)
        try:
            row['due_date'] = str(date.fromisoformat(str(due_raw)[:10]))
        except ValueError:
            return JsonResponse({'error': 'due_date must be a valid ISO date (YYYY-MM-DD)'}, status=400)

    if 'assigned_to' in body or 'assignedTo' in body:
        row['assigned_to'] = (body.get('assigned_to') or body.get('assignedTo') or '').strip()[:255]

    if 'action_status' in body or 'status' in body:
        row['action_status'] = (body.get('action_status') or body.get('status') or '').strip()[:64]

    if 'notes' in body:
        row['mitigation_notes'] = (body.get('notes') or '').strip()[:5000]

    actions[0] = row
    ra.mitigation_actions = actions
    ra.save(update_fields=['mitigation_actions', 'updated_at'])

    old_status = report.status
    action_status = (row.get('action_status') or '').lower()
    if action_status == 'completed' and report.status != IncidentReport.Status.CLOSED:
        report.status = IncidentReport.Status.CLOSED
        report.save(update_fields=['status'])
        _append_history(report, old_status, IncidentReport.Status.CLOSED, request.user, 'Closed after mitigation completed')
    elif report.status == IncidentReport.Status.ASSESSED:
        report.status = IncidentReport.Status.IN_PROGRESS
        report.save(update_fields=['status'])
        _append_history(report, old_status, IncidentReport.Status.IN_PROGRESS, request.user, 'Mitigation tracking updated')

    return JsonResponse(
        {
            'ok': True,
            'report_id': report.public_id(),
            'message': 'Mitigation updated.',
            'status_code': report.status,
        },
        status=200,
    )


@csrf_exempt
@require_http_methods(['POST'])
def mitigation_extend_deadline(request, action_ref: str):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    if not _is_admin(request.user):
        return JsonResponse({'error': 'Admin role required'}, status=403)
    parsed = _parse_mitigation_action_ref(action_ref)
    if not parsed:
        return JsonResponse({'error': 'Invalid action reference (expected e.g. RPT-12-A1)'}, status=400)
    pk, action_1based = parsed
    idx = action_1based - 1
    if idx < 0:
        return JsonResponse({'error': 'Invalid action index'}, status=400)
    try:
        report = IncidentReport.objects.select_related('risk_assessment').get(pk=pk)
    except IncidentReport.DoesNotExist:
        return JsonResponse({'error': 'Report not found'}, status=404)
    try:
        ra = report.risk_assessment
    except RiskAssessment.DoesNotExist:
        return JsonResponse({'error': 'No risk assessment for this report'}, status=404)

    try:
        body = json.loads(request.body.decode() or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    new_raw = (body.get('new_due_date') or body.get('newDueDate') or '').strip()
    extension_reason = (body.get('extension_reason') or body.get('extensionReason') or '').strip()
    justification = (body.get('justification') or '').strip()
    if not new_raw:
        return JsonResponse({'error': 'new_due_date is required'}, status=400)
    if not extension_reason:
        return JsonResponse({'error': 'extension_reason is required'}, status=400)
    if not justification:
        return JsonResponse({'error': 'justification is required'}, status=400)
    try:
        new_due = str(date.fromisoformat(str(new_raw)[:10]))
    except ValueError:
        return JsonResponse({'error': 'new_due_date must be a valid ISO date (YYYY-MM-DD)'}, status=400)

    actions = list(ra.mitigation_actions or [])
    if not (0 <= idx < len(actions)) or not isinstance(actions[idx], dict):
        return JsonResponse({'error': 'Mitigation action not found'}, status=404)

    row = dict(actions[idx])
    old_due = (row.get('due_date') or row.get('dueDate') or '')[:32]
    row['due_date'] = new_due
    ext_log = row.get('extension_log')
    if not isinstance(ext_log, list):
        ext_log = []
    ext_log.append(
        {
            'previous_due': old_due,
            'new_due': new_due,
            'reason': extension_reason[:128],
            'justification': justification[:2000],
            'notify_team': bool(body.get('notify_team', body.get('notifyTeam', True))),
            'changed_by': request.user.get_username(),
        }
    )
    row['extension_log'] = ext_log[-25:]
    actions[idx] = row
    ra.mitigation_actions = actions
    ra.save(update_fields=['mitigation_actions', 'updated_at'])
    ref = f'{report.public_id()}-A{action_1based}'
    _append_history(
        report,
        report.status,
        report.status,
        request.user,
        note=f'Deadline extended for mitigation {ref} to {new_due}',
    )
    return JsonResponse(
        {
            'ok': True,
            'action_ref': ref,
            'new_due_date': new_due,
            'message': f'Deadline updated to {new_due} for {ref}.',
        },
        status=200,
    )


@csrf_exempt
@require_http_methods(['POST'])
def mitigation_tracking_update(request, report_id: str):
    """Update tracking fields on the first mitigation action (dashboard 'Update mitigation')."""
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    if not _is_admin(request.user):
        return JsonResponse({'error': 'Admin role required'}, status=403)
    try:
        pk = _parse_report_pk(report_id)
    except ValueError:
        return JsonResponse({'error': 'Invalid report id'}, status=400)
    try:
        report = IncidentReport.objects.select_related('risk_assessment').get(pk=pk)
    except IncidentReport.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    try:
        ra = report.risk_assessment
    except RiskAssessment.DoesNotExist:
        return JsonResponse({'error': 'No risk assessment for this report'}, status=404)

    try:
        body = json.loads(request.body.decode() or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    plan = (body.get('mitigation_plan') or body.get('mitigationPlan') or '').strip()
    due_raw = (body.get('due_date') or body.get('dueDate') or '').strip()
    assigned_to = (body.get('assigned_to') or body.get('assignedTo') or '').strip()
    action_status = (body.get('action_status') or body.get('status') or '').strip()
    notes = (body.get('notes') or '').strip()
    if not plan:
        return JsonResponse({'error': 'mitigation_plan is required'}, status=400)
    if not due_raw:
        return JsonResponse({'error': 'due_date is required'}, status=400)
    try:
        due_norm = str(date.fromisoformat(str(due_raw)[:10]))
    except ValueError:
        return JsonResponse({'error': 'due_date must be a valid ISO date (YYYY-MM-DD)'}, status=400)

    actions = list(ra.mitigation_actions or [])
    if not actions:
        return JsonResponse({'error': 'No mitigation actions on this assessment'}, status=400)
    if not isinstance(actions[0], dict):
        return JsonResponse({'error': 'Invalid mitigation_actions data'}, status=400)

    row = dict(actions[0])
    row['description'] = plan
    row['due_date'] = due_norm
    if assigned_to:
        row['assigned_to'] = assigned_to[:255]
    if action_status:
        row['action_status'] = action_status[:64]
    row['mitigation_notes'] = notes[:5000]
    actions[0] = row
    ra.mitigation_actions = actions
    ra.save(update_fields=['mitigation_actions', 'updated_at'])

    old_status = report.status
    if (action_status or '').lower() == 'completed' and report.status != IncidentReport.Status.CLOSED:
        report.status = IncidentReport.Status.CLOSED
        report.save(update_fields=['status'])
        _append_history(report, old_status, IncidentReport.Status.CLOSED, request.user, 'Closed after mitigation completed')
    elif report.status == IncidentReport.Status.ASSESSED:
        report.status = IncidentReport.Status.IN_PROGRESS
        report.save(update_fields=['status'])
        _append_history(report, old_status, IncidentReport.Status.IN_PROGRESS, request.user, 'Mitigation tracking updated')

    return JsonResponse(
        {
            'ok': True,
            'report_id': report.public_id(),
            'message': 'Mitigation tracking saved.',
            'status_code': report.status,
        },
        status=200,
    )


@csrf_exempt
@require_http_methods(['POST'])
def mitigation_complete_action(request, action_ref: str):
    """Mark a mitigation action as completed by action reference (e.g. RPT-12-A1)."""
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    if not _is_admin(request.user):
        return JsonResponse({'error': 'Admin role required'}, status=403)
    parsed = _parse_mitigation_action_ref(action_ref)
    if not parsed:
        return JsonResponse({'error': 'Invalid action reference (expected e.g. RPT-12-A1)'}, status=400)
    pk, action_1based = parsed
    idx = action_1based - 1
    if idx < 0:
        return JsonResponse({'error': 'Invalid action index'}, status=400)
    try:
        report = IncidentReport.objects.select_related('risk_assessment').get(pk=pk)
    except IncidentReport.DoesNotExist:
        return JsonResponse({'error': 'Report not found'}, status=404)
    try:
        ra = report.risk_assessment
    except RiskAssessment.DoesNotExist:
        return JsonResponse({'error': 'No risk assessment for this report'}, status=404)

    actions = list(ra.mitigation_actions or [])
    if not (0 <= idx < len(actions)) or not isinstance(actions[idx], dict):
        return JsonResponse({'error': 'Mitigation action not found'}, status=404)

    row = dict(actions[idx])
    row['action_status'] = 'Completed'
    row['completed_at'] = timezone.localtime(timezone.now()).isoformat()
    row['completed_by'] = request.user.get_username()
    actions[idx] = row
    ra.mitigation_actions = actions
    ra.save(update_fields=['mitigation_actions', 'updated_at'])

    old_status = report.status
    if report.status != IncidentReport.Status.CLOSED:
        report.status = IncidentReport.Status.CLOSED
        report.save(update_fields=['status'])
        _append_history(
            report,
            old_status,
            IncidentReport.Status.CLOSED,
            request.user,
            note=f'Mitigation action {action_ref} marked completed',
        )

    return JsonResponse(
        {
            'ok': True,
            'action_ref': action_ref,
            'message': f'{action_ref} marked as completed.',
            'status_code': report.status,
        },
        status=200,
    )


def _severity_label(risk_level: str) -> str:
    if 'High' in risk_level:
        return 'High'
    if 'Medium' in risk_level:
        return 'Medium'
    return 'Low'


@require_http_methods(['GET', 'HEAD'])
def dashboard_summary(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    if not _is_admin(request.user):
        return JsonResponse({'error': 'Admin role required'}, status=403)

    start_raw = (request.GET.get('start_date') or '').strip()
    end_raw = (request.GET.get('end_date') or '').strip()
    start_d = None
    end_d = None
    if start_raw:
        try:
            start_d = date.fromisoformat(start_raw[:10])
        except ValueError:
            return JsonResponse({'error': 'start_date must be YYYY-MM-DD'}, status=400)
    if end_raw:
        try:
            end_d = date.fromisoformat(end_raw[:10])
        except ValueError:
            return JsonResponse({'error': 'end_date must be YYYY-MM-DD'}, status=400)
    if start_d and end_d and start_d > end_d:
        return JsonResponse({'error': 'start_date cannot be after end_date'}, status=400)

    date_filter = {}
    if start_d:
        date_filter['created_at__date__gte'] = start_d
    if end_d:
        date_filter['created_at__date__lte'] = end_d

    base_reports = IncidentReport.objects.filter(**date_filter) if date_filter else IncidentReport.objects.all()

    pending_count = base_reports.filter(status=IncidentReport.Status.PENDING).count()
    open_reports = base_reports.filter(
        status__in=[IncidentReport.Status.ASSESSED, IncidentReport.Status.IN_PROGRESS]
    ).select_related('risk_assessment')
    open_risks_count = open_reports.count()

    today = date.today()
    overdue_actions = []
    for r in open_reports:
        try:
            ra = r.risk_assessment
        except RiskAssessment.DoesNotExist:
            continue
        for i, act in enumerate(ra.mitigation_actions or []):
            if not isinstance(act, dict):
                continue
            due_raw = act.get('due_date') or act.get('dueDate')
            if not due_raw:
                continue
            try:
                due_d = date.fromisoformat(str(due_raw)[:10])
            except ValueError:
                continue
            if due_d < today:
                overdue_actions.append(
                    {
                        'id': f'{r.public_id()}-A{i + 1}',
                        'task': (act.get('description') or '')[:200],
                        'dueDate': str(due_raw),
                        'daysOverdue': (today - due_d).days,
                        'assignedTo': '—',
                        'relatedRisk': r.public_id(),
                    }
                )

    open_risks_rows = []
    risk_register_rows = []
    for r in open_reports[:100]:
        try:
            ra = r.risk_assessment
        except RiskAssessment.DoesNotExist:
            continue
        loc = r.location_line()
        assessed_local = timezone.localtime(ra.updated_at).date().isoformat()
        open_risks_rows.append(
            {
                'id': r.public_id(),
                'hazard': r.hazard_summary(),
                'severity': _severity_label(ra.risk_level),
                'status': r.get_status_display(),
                'score': ra.risk_score,
                'location': loc,
                'dateAssessed': assessed_local,
            }
        )
        risk_register_rows.append(
            {
                'id': r.public_id(),
                'severity': _severity_label(ra.risk_level),
                'status': r.get_status_display(),
            }
        )

    hazard_frequency: dict[str, int] = {}
    recent = base_reports[:500]
    for r in recent:
        for h in r.hazard_types or []:
            if isinstance(h, str) and h.strip():
                hazard_frequency[h] = hazard_frequency.get(h, 0) + 1
    hazard_frequency_list = sorted(
        [{'hazard': k, 'count': v} for k, v in hazard_frequency.items()],
        key=lambda x: -x['count'],
    )[:20]

    top_risk_types = (
        RiskAssessment.objects.filter(report__in=base_reports).values('risk_classification')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )
    top_risk_types_list = [
        {'risk_type': (row.get('risk_classification') or 'Uncategorized'), 'count': row.get('count', 0)}
        for row in top_risk_types
    ]

    closed_reports = base_reports.filter(status=IncidentReport.Status.CLOSED).select_related('risk_assessment')
    mitigation_tracking = _mitigation_tracking_stats(
        today,
        open_reports,
        overdue_actions,
        closed_reports_qs=closed_reports,
    )

    return JsonResponse(
        {
            'pending_count': pending_count,
            'open_risks_count': open_risks_count,
            'overdue_actions_count': len(overdue_actions),
            'open_risks': open_risks_rows,
            'overdue_actions': overdue_actions[:50],
            'risk_register': risk_register_rows[:50],
            'hazard_frequency': hazard_frequency_list,
            'top_risk_types': top_risk_types_list,
            'mitigation_tracking': mitigation_tracking,
        }
    )


_PDF_CLASS_LABELS = {
    'earthquake-impact': 'Earthquake Impact',
    'fire-hazard': 'Fire Hazard',
    'laboratory-hazard': 'Laboratory Hazard',
    'campus-security': 'Campus Security Risk',
    'traffic-safety': 'Traffic Safety Risk',
    'flooding-impact': 'Flooding Impact',
    'electrical-hazard': 'Electrical Hazard',
    'evacuation-failure': 'Emergency Evacuation Failure',
    'slip-trip-fall': 'Slip / Trip / Fall',
    'public-health': 'Public Health Risk',
}

_PDF_LIK_LABELS = {1: 'Rare', 2: 'Unlikely', 3: 'Possible', 4: 'Likely', 5: 'Very likely'}

_PDF_SEV_LABELS = {
    1: 'Insignificant',
    2: 'Minor',
    3: 'Moderate',
    4: 'Major',
    5: 'Catastrophic',
}


def _pdf_p(text: str, style: ParagraphStyle) -> Paragraph:
    safe = escape(str(text or '')).replace('\n', '<br/>')
    return Paragraph(safe, style)


def _build_assessment_pdf_report(report: IncidentReport, ra: RiskAssessment) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=0.65 * inch,
        bottomMargin=0.65 * inch,
        title=f'{report.public_id()} risk assessment',
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        name='CampTitle',
        parent=styles['Heading1'],
        fontSize=14,
        leading=18,
        spaceAfter=6,
        textColor=colors.HexColor('#1e40af'),
    )
    sub_style = ParagraphStyle(
        name='CampSub',
        parent=styles['Normal'],
        fontSize=9,
        leading=11,
        textColor=colors.HexColor('#64748b'),
    )
    h2 = ParagraphStyle(
        name='CampH2',
        parent=styles['Heading2'],
        fontSize=11,
        leading=14,
        spaceBefore=10,
        spaceAfter=6,
        textColor=colors.HexColor('#0f172a'),
    )
    body = ParagraphStyle(name='CampBody', parent=styles['Normal'], fontSize=10, leading=13)
    tbl_cell = ParagraphStyle(name='CampTblCell', parent=styles['Normal'], fontSize=8, leading=10)

    story: list = []
    story.append(Paragraph('CAMP-RISK', title_style))
    story.append(_pdf_p('Xavier University – Risk Assessment Report (HIRAC-aligned summary)', sub_style))
    gen = timezone.localtime(timezone.now()).strftime('%Y-%m-%d %H:%M %Z').strip()
    story.append(_pdf_p(f'Generated: {gen}', sub_style))
    story.append(Spacer(1, 0.12 * inch))

    story.append(Paragraph('1. Incident', h2))
    story.append(_pdf_p(f'Report ID: {report.public_id()}', body))
    story.append(_pdf_p(f'Status: {report.get_status_display()}', body))
    story.append(_pdf_p(f'Hazard summary: {report.hazard_summary()}', body))
    hz = ', '.join(str(h) for h in (report.hazard_types or []) if str(h).strip())
    story.append(_pdf_p(f'Hazard types recorded: {hz or "—"}', body))
    if report.other_hazard:
        story.append(_pdf_p(f'Other hazard detail: {report.other_hazard}', body))
    story.append(_pdf_p(f'Location: {report.location_line()}', body))
    story.append(_pdf_p(f'Reported by: {report.submitted_by_name}', body))
    created = timezone.localtime(report.created_at)
    story.append(_pdf_p(f'Report submitted: {created.strftime("%Y-%m-%d %I:%M %p")}', body))
    story.append(_pdf_p(f'Incident description:\n{report.description or "—"}', body))
    story.append(Spacer(1, 0.08 * inch))

    cls = ra.risk_classification or ''
    cls_label = _PDF_CLASS_LABELS.get(cls, cls or '—')
    li = ra.likelihood
    se = ra.severity
    try:
        li_i = int(li)
        li_txt = f'{li_i} ({_PDF_LIK_LABELS.get(li_i, "—")})'
    except (TypeError, ValueError):
        li_txt = '—'
    try:
        se_i = int(se)
        se_txt = f'{se_i} ({_PDF_SEV_LABELS.get(se_i, "—")})'
    except (TypeError, ValueError):
        se_txt = '—'
    assessed_by = ''
    try:
        if ra.assessed_by:
            assessed_by = ra.assessed_by.get_full_name().strip() or ra.assessed_by.get_username()
    except Exception:
        assessed_by = ''
    assessed_at = timezone.localtime(ra.updated_at).strftime('%Y-%m-%d %I:%M %p')

    story.append(Paragraph('2. Risk assessment', h2))
    story.append(_pdf_p(f'Risk classification: {cls_label}', body))
    story.append(_pdf_p(f'Likelihood: {li_txt}', body))
    story.append(_pdf_p(f'Severity: {se_txt}', body))
    story.append(_pdf_p(f'Risk score: {ra.risk_score}   Level: {ra.risk_level}', body))
    story.append(_pdf_p(f'Residual risk (after controls): {ra.residual_risk or "—"}', body))
    story.append(_pdf_p(f'Assessed by: {assessed_by or "—"}', body))
    story.append(_pdf_p(f'Assessment last updated: {assessed_at}', body))
    story.append(Spacer(1, 0.06 * inch))

    story.append(Paragraph('3. Control measures', h2))
    story.append(_pdf_p(f'Engineering: {ra.engineering_controls or "—"}', body))
    story.append(_pdf_p(f'Administrative: {ra.administrative_controls or "—"}', body))
    story.append(_pdf_p(f'PPE: {ra.ppe_controls or "—"}', body))
    story.append(Spacer(1, 0.08 * inch))

    story.append(Paragraph('4. Mitigation actions', h2))
    mit_rows = [['#', 'Action', 'Due date']]
    for i, act in enumerate(ra.mitigation_actions or [], start=1):
        if not isinstance(act, dict):
            continue
        desc = (act.get('description') or '')[:2000]
        due = str(act.get('due_date') or act.get('dueDate') or '')
        mit_rows.append(
            [
                Paragraph(escape(str(i)), tbl_cell),
                _pdf_p(desc, tbl_cell),
                _pdf_p(due, tbl_cell),
            ]
        )
    if len(mit_rows) == 1:
        story.append(_pdf_p('No mitigation actions recorded.', body))
    else:
        t = Table(mit_rows, colWidths=[0.35 * inch, 4.9 * inch, 1.1 * inch])
        t.setStyle(
            TableStyle(
                [
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 9),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
                    ('LEFTPADDING', (0, 0), (-1, -1), 5),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 5),
                    ('TOPPADDING', (0, 0), (-1, -1), 5),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ]
            )
        )
        story.append(t)

    irs = list(report.information_requests.all()[:10])
    if irs:
        story.append(Spacer(1, 0.1 * inch))
        story.append(Paragraph('5. Information requests (on file)', h2))
        for ir in irs:
            created_ir = timezone.localtime(ir.created_at).strftime('%Y-%m-%d %H:%M')
            payload = ir.payload or {}
            qs = payload.get('specificQuestions') or ''
            story.append(_pdf_p(f'— {created_ir}: {qs}', body))

    doc.build(story)
    data = buf.getvalue()
    buf.close()
    return data


@require_http_methods(['GET'])
def report_assessment_pdf(request, report_id: str):
    """Printable PDF after risk assessment (admin only)."""
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    if not _is_admin(request.user):
        return JsonResponse({'error': 'Admin role required'}, status=403)
    try:
        pk = _parse_report_pk(report_id)
    except ValueError:
        return JsonResponse({'error': 'Invalid report id'}, status=400)
    try:
        report = IncidentReport.objects.select_related('risk_assessment').get(pk=pk)
    except IncidentReport.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    try:
        ra = report.risk_assessment
    except RiskAssessment.DoesNotExist:
        return JsonResponse({'error': 'No risk assessment for this report yet'}, status=404)

    pdf_bytes = _build_assessment_pdf_report(report, ra)
    filename = f'{report.public_id()}-risk-assessment.pdf'
    resp = HttpResponse(pdf_bytes, content_type='application/pdf')
    # Inline disposition lets the browser open PDF preview first
    # (with native download/print controls in the viewer).
    resp['Content-Disposition'] = f'inline; filename="{filename}"'
    return resp


def _mitigation_tracking_stats(today, open_reports_qs, overdue_actions_list, closed_reports_qs=None):
    """Bucket mitigation actions: completed (closed incidents), in-progress (open, on time), overdue."""
    closed_reports = closed_reports_qs
    if closed_reports is None:
        closed_reports = IncidentReport.objects.filter(status=IncidentReport.Status.CLOSED).select_related(
            'risk_assessment'
        )
    completed_actions = 0
    for r in closed_reports:
        try:
            ra = r.risk_assessment
        except RiskAssessment.DoesNotExist:
            continue
        for act in ra.mitigation_actions or []:
            if not isinstance(act, dict):
                continue
            if (act.get('description') or '').strip() or (act.get('due_date') or act.get('dueDate')):
                completed_actions += 1

    overdue_count = len(overdue_actions_list)
    in_progress_actions = 0
    for r in open_reports_qs:
        try:
            ra = r.risk_assessment
        except RiskAssessment.DoesNotExist:
            continue
        for act in ra.mitigation_actions or []:
            if not isinstance(act, dict):
                continue
            desc = (act.get('description') or '').strip()
            due_raw = act.get('due_date') or act.get('dueDate')
            if not desc and not due_raw:
                continue
            if not due_raw:
                in_progress_actions += 1
                continue
            try:
                due_d = date.fromisoformat(str(due_raw)[:10])
            except ValueError:
                in_progress_actions += 1
                continue
            if due_d < today:
                continue
            in_progress_actions += 1

    total = completed_actions + in_progress_actions + overdue_count
    if total == 0:
        return {
            'total_actions': 0,
            'completed_actions': 0,
            'in_progress_actions': 0,
            'overdue_actions': 0,
            'completed_pct': 0,
            'in_progress_pct': 0,
            'overdue_pct': 0,
        }

    return {
        'total_actions': total,
        'completed_actions': completed_actions,
        'in_progress_actions': in_progress_actions,
        'overdue_actions': overdue_count,
        'completed_pct': round(100 * completed_actions / total),
        'in_progress_pct': round(100 * in_progress_actions / total),
        'overdue_pct': round(100 * overdue_count / total),
    }
