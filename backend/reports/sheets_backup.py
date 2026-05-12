"""
Optional backup of incidents and assessments to Google Sheets (organized tabs).

Enable with environment variables:
  GOOGLE_SHEETS_BACKUP_ENABLED=1
  GOOGLE_SHEETS_SPREADSHEET_ID=<id from the sheet URL>

Optional (UI "open spreadsheet" link without deriving from ID):
  GOOGLE_SHEETS_BROWSER_URL=https://docs.google.com/spreadsheets/d/.../edit

Service account JSON (pick one):
  GOOGLE_SERVICE_ACCOUNT_JSON_B64 — base64-encoded JSON (good for Render)
  GOOGLE_SERVICE_ACCOUNT_FILE — path to the JSON file
  GOOGLE_APPLICATION_CREDENTIALS — standard Google env pointing to JSON file

Share the spreadsheet with the service account email (Editor) from the JSON
"client_email" field. Install deps: gspread, google-auth (see requirements.txt).

Tabs used:
  CAMP_Incidents — new guard reports (when created)
  CAMP_AssessedReports — one row when SSIO first completes a risk assessment (report becomes Assessed)
  CAMP_Assessments — short assessment summary (same moment as CAMP_AssessedReports)
"""

from __future__ import annotations

import base64
import json
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

_INCIDENT_HEADERS = [
    'Backed up at (UTC)',
    'Report ID',
    'Status',
    'Guard name',
    'Guard user ID',
    'Location',
    'Hazard summary',
    'Hazard types',
    'Other hazard',
    'Description (excerpt)',
    'Has photo',
]
_ASSESSMENT_HEADERS = [
    'Backed up at (UTC)',
    'Report ID',
    'Risk classification',
    'Risk score',
    'Risk level',
    'Likelihood',
    'Severity',
    'Assessed by',
    'Assessment updated (local)',
]
_ASSESSED_REPORT_HEADERS = [
    'Logged at (UTC)',
    'Report ID',
    'Report status',
    'Guard name',
    'Guard user ID',
    'Location',
    'Hazard summary',
    'Description (excerpt)',
    'Risk classification',
    'Risk score',
    'Risk level',
    'Likelihood',
    'Severity',
    'Residual risk (excerpt)',
    'Mitigation actions (count)',
    'Assessed by',
    'Assessment saved (local)',
]


def _backup_enabled() -> bool:
    return os.environ.get('GOOGLE_SHEETS_BACKUP_ENABLED', '').strip().lower() in ('1', 'true', 'yes') and bool(
        os.environ.get('GOOGLE_SHEETS_SPREADSHEET_ID', '').strip()
    )


def _load_service_account_info() -> dict[str, Any] | None:
    b64 = os.environ.get('GOOGLE_SERVICE_ACCOUNT_JSON_B64', '').strip()
    if b64:
        try:
            raw = base64.b64decode(b64)
            return json.loads(raw.decode('utf-8'))
        except (OSError, ValueError, json.JSONDecodeError) as e:
            logger.warning('Invalid GOOGLE_SERVICE_ACCOUNT_JSON_B64: %s', e)
            return None
    path = (os.environ.get('GOOGLE_SERVICE_ACCOUNT_FILE') or '').strip()
    if path and os.path.isfile(path):
        try:
            with open(path, encoding='utf-8') as f:
                return json.load(f)
        except (OSError, json.JSONDecodeError) as e:
            logger.warning('Could not read GOOGLE_SERVICE_ACCOUNT_FILE: %s', e)
            return None
    gac = (os.environ.get('GOOGLE_APPLICATION_CREDENTIALS') or '').strip()
    if gac and os.path.isfile(gac):
        try:
            with open(gac, encoding='utf-8') as f:
                return json.load(f)
        except (OSError, json.JSONDecodeError) as e:
            logger.warning('Could not read GOOGLE_APPLICATION_CREDENTIALS: %s', e)
            return None
    return None


def _spreadsheet_client():
    try:
        import gspread
        from google.oauth2.service_account import Credentials
    except ImportError:
        logger.warning('gspread/google-auth not installed; Google Sheets backup skipped.')
        return None

    if not _backup_enabled():
        return None
    info = _load_service_account_info()
    if not info:
        logger.warning('Google Sheets backup enabled but credentials missing or invalid.')
        return None
    sid = os.environ.get('GOOGLE_SHEETS_SPREADSHEET_ID', '').strip()
    scopes = ['https://www.googleapis.com/auth/spreadsheets']
    creds = Credentials.from_service_account_info(info, scopes=scopes)
    gc = gspread.authorize(creds)
    return gc.open_by_key(sid)


def _ensure_worksheet(sh, title: str, headers: list[str]):
    import gspread

    try:
        ws = sh.worksheet(title)
    except gspread.WorksheetNotFound:
        ws = sh.add_worksheet(title=title, rows=3000, cols=max(12, len(headers)))
        ws.append_row(headers)
        return ws
    existing = ws.row_values(1)
    if not existing:
        ws.insert_row(headers, 1)
    return ws


def append_incident_created_row(report) -> None:
    """Append one row when a new incident is created (post_save created=True)."""
    if not _backup_enabled():
        return
    try:
        from django.utils import timezone
    except ImportError:
        return

    sh = _spreadsheet_client()
    if sh is None:
        return
    ws = _ensure_worksheet(sh, 'CAMP_Incidents', _INCIDENT_HEADERS)
    hz = ', '.join(str(h) for h in (report.hazard_types or []) if str(h).strip())
    desc = (report.description or '')[:500]
    row = [
        timezone.now().strftime('%Y-%m-%d %H:%M:%SZ'),
        report.public_id(),
        report.get_status_display(),
        report.submitted_by_name,
        report.submitted_by_user_id,
        report.location_line(),
        report.hazard_summary(),
        hz,
        report.other_hazard or '',
        desc,
        'Yes' if report.photo else 'No',
    ]
    try:
        ws.append_row(row, value_input_option='USER_ENTERED')
    except Exception:
        logger.exception('Failed to append incident row to Google Sheets')


def append_assessment_row(ra) -> None:
    """Append a short row when a risk assessment is first created (SSIO submits assessment)."""
    if not _backup_enabled():
        return
    try:
        from django.utils import timezone
    except ImportError:
        return

    sh = _spreadsheet_client()
    if sh is None:
        return
    ws = _ensure_worksheet(sh, 'CAMP_Assessments', _ASSESSMENT_HEADERS)
    report = ra.report
    assessed_by = ''
    try:
        if ra.assessed_by:
            assessed_by = ra.assessed_by.get_full_name().strip() or ra.assessed_by.get_username()
    except Exception:  # noqa: BLE001
        assessed_by = ''
    updated = timezone.localtime(ra.updated_at).strftime('%Y-%m-%d %H:%M')
    row = [
        timezone.now().strftime('%Y-%m-%d %H:%M:%SZ'),
        report.public_id(),
        ra.risk_classification or '',
        ra.risk_score,
        ra.risk_level or '',
        ra.likelihood,
        ra.severity,
        assessed_by,
        updated,
    ]
    try:
        ws.append_row(row, value_input_option='USER_ENTERED')
    except Exception:
        logger.exception('Failed to append assessment row to Google Sheets')


def append_assessed_report_row(ra) -> None:
    """One combined row per newly assessed incident (first RiskAssessment save). Tab: CAMP_AssessedReports."""
    if not _backup_enabled():
        return
    try:
        from django.utils import timezone
    except ImportError:
        return

    sh = _spreadsheet_client()
    if sh is None:
        return
    ws = _ensure_worksheet(sh, 'CAMP_AssessedReports', _ASSESSED_REPORT_HEADERS)
    report = ra.report
    assessed_by = ''
    try:
        if ra.assessed_by:
            assessed_by = ra.assessed_by.get_full_name().strip() or ra.assessed_by.get_username()
    except Exception:  # noqa: BLE001
        assessed_by = ''
    desc = (report.description or '')[:400]
    residual = (ra.residual_risk or '')[:400]
    actions = ra.mitigation_actions or []
    action_count = len([a for a in actions if isinstance(a, dict) and (str(a.get('description') or '').strip())])
    assessed_local = timezone.localtime(ra.updated_at).strftime('%Y-%m-%d %H:%M')
    row = [
        timezone.now().strftime('%Y-%m-%d %H:%M:%SZ'),
        report.public_id(),
        report.get_status_display(),
        report.submitted_by_name,
        report.submitted_by_user_id,
        report.location_line(),
        report.hazard_summary(),
        desc,
        ra.risk_classification or '',
        ra.risk_score,
        ra.risk_level or '',
        ra.likelihood,
        ra.severity,
        residual,
        action_count,
        assessed_by,
        assessed_local,
    ]
    try:
        ws.append_row(row, value_input_option='USER_ENTERED')
    except Exception:
        logger.exception('Failed to append assessed report row to Google Sheets')
