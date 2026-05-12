import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import IncidentReport, RiskAssessment

logger = logging.getLogger(__name__)


@receiver(post_save, sender=IncidentReport)
def backup_new_incident_to_sheets(sender, instance, created, **kwargs):
    if not created:
        return
    try:
        from .sheets_backup import append_incident_created_row

        append_incident_created_row(instance)
    except Exception:
        logger.exception('Google Sheets incident backup hook failed')


@receiver(post_save, sender=RiskAssessment)
def backup_assessment_to_sheets(sender, instance, created, **kwargs):
    """When SSIO first saves a risk assessment, append assessed snapshot + short summary to Google Sheets."""
    if not created:
        return
    try:
        from .sheets_backup import append_assessed_report_row, append_assessment_row

        append_assessed_report_row(instance)
        append_assessment_row(instance)
    except Exception:
        logger.exception('Google Sheets assessment backup hook failed')
