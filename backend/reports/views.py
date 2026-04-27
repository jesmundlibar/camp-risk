import json
import re
from datetime import date
from datetime import datetime
from typing import Optional, Tuple

from django.db.models import Count, Prefetch
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from accounts.models import UserProfile

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
    high = {'Fire Hazard', 'Chemical Spill', 'Electrical Fault', 'Structural Damage'}
    if any(h in high for h in (hazard_types or [])):
        return 'High'
    return 'Medium'


def _risk_level_from_score(score: int) -> str:
    if score >= 12:
        return 'High Risk'
    if score >= 6:
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
        return JsonResponse({'error': 'likelihood and severity must be integers 1-4'}, status=400)
    if not (1 <= li <= 4 and 1 <= se <= 4):
        return JsonResponse({'error': 'likelihood and severity must be between 1 and 4'}, status=400)

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

    pending_count = IncidentReport.objects.filter(status=IncidentReport.Status.PENDING).count()
    open_reports = IncidentReport.objects.filter(
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
    recent = IncidentReport.objects.all()[:500]
    for r in recent:
        for h in r.hazard_types or []:
            if isinstance(h, str) and h.strip():
                hazard_frequency[h] = hazard_frequency.get(h, 0) + 1
    hazard_frequency_list = sorted(
        [{'hazard': k, 'count': v} for k, v in hazard_frequency.items()],
        key=lambda x: -x['count'],
    )[:20]

    mitigation_tracking = _mitigation_tracking_stats(today, open_reports, overdue_actions)

    return JsonResponse(
        {
            'pending_count': pending_count,
            'open_risks_count': open_risks_count,
            'overdue_actions_count': len(overdue_actions),
            'open_risks': open_risks_rows,
            'overdue_actions': overdue_actions[:50],
            'risk_register': risk_register_rows[:50],
            'hazard_frequency': hazard_frequency_list,
            'mitigation_tracking': mitigation_tracking,
        }
    )


def _mitigation_tracking_stats(today, open_reports_qs, overdue_actions_list):
    """Bucket mitigation actions: completed (closed incidents), in-progress (open, on time), overdue."""
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
