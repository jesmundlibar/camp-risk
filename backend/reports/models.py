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
