from django.contrib import admin

from .models import IncidentReport


@admin.register(IncidentReport)
class IncidentReportAdmin(admin.ModelAdmin):
    list_display = ('display_public_id', 'display_hazard', 'status', 'submitted_by_name', 'created_at')
    list_filter = ('status', 'priority')
    search_fields = ('building', 'submitted_by_name', 'description')

    @admin.display(description='ID')
    def display_public_id(self, obj: IncidentReport) -> str:
        return obj.public_id()

    @admin.display(description='Hazard')
    def display_hazard(self, obj: IncidentReport) -> str:
        return obj.hazard_summary()
