from django.conf import settings
from django.db import models


class IncidentReport(models.Model):
    """Incident filed by campus security; stored for admin risk assessment."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ASSESSED = 'assessed', 'Assessed'
        IN_PROGRESS = 'in_progress', 'In Progress'
        CLOSED = 'closed', 'Closed'

    submitted_by_user_id = models.CharField(max_length=64, db_index=True)
    submitted_by_name = models.CharField(max_length=255)
    hazard_types = models.JSONField(default=list)
    other_hazard = models.CharField(max_length=500, blank=True)
    building = models.CharField(max_length=255)
    floor = models.CharField(max_length=255)
    room = models.CharField(max_length=255)
    specific_location = models.CharField(max_length=500, blank=True)
    description = models.TextField(blank=True)
    photo = models.ImageField(upload_to='report_photos/%Y/%m/', blank=True, null=True)
    priority = models.CharField(max_length=20, default='Medium')
    status = models.CharField(
        max_length=32,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def public_id(self) -> str:
        return f'RPT-{self.pk}'

    def hazard_summary(self) -> str:
        types = list(self.hazard_types or [])
        if self.other_hazard and 'Other (specify)' in types:
            return self.other_hazard.strip() or ', '.join(types) or 'Incident'
        return ', '.join(types) if types else 'Incident'

    def location_line(self) -> str:
        parts = [self.building, self.floor]
        if self.room and self.room.upper() != 'N/A':
            parts.append(self.room)
        if self.specific_location:
            parts.append(self.specific_location)
        return ', '.join(p for p in parts if p)


class RiskAssessment(models.Model):
    """HIRAC-style assessment linked one-to-one with an incident report."""

    report = models.OneToOneField(
        IncidentReport,
        on_delete=models.CASCADE,
        related_name='risk_assessment',
    )
    risk_classification = models.CharField(max_length=128, blank=True)
    likelihood = models.PositiveSmallIntegerField()
    severity = models.PositiveSmallIntegerField()
    risk_score = models.PositiveSmallIntegerField()
    risk_level = models.CharField(max_length=64)
    engineering_controls = models.TextField(blank=True)
    administrative_controls = models.TextField(blank=True)
    ppe_controls = models.TextField(blank=True)
    residual_risk = models.TextField(blank=True)
    mitigation_actions = models.JSONField(default=list)
    assessed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='risk_assessments_done',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']


class InformationRequest(models.Model):
    """Admin request for clarification or extra details from the reporting guard."""

    report = models.ForeignKey(
        IncidentReport,
        on_delete=models.CASCADE,
        related_name='information_requests',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='information_requests_sent',
    )
    payload = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


class ReportStatusHistory(models.Model):
    """Audit trail of report status transitions."""

    report = models.ForeignKey(
        IncidentReport,
        on_delete=models.CASCADE,
        related_name='status_history',
    )
    from_status = models.CharField(max_length=32, blank=True)
    to_status = models.CharField(max_length=32)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
