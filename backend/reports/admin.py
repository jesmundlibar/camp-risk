from django.contrib import admin

from .models import IncidentReport, InformationRequest, ReportStatusHistory, RiskAssessment


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


@admin.register(RiskAssessment)
class RiskAssessmentAdmin(admin.ModelAdmin):
    list_display = ('report', 'risk_level', 'risk_score', 'updated_at')
    list_filter = ('risk_level',)


@admin.register(InformationRequest)
class InformationRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'report', 'created_by', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('report__building', 'report__submitted_by_name')


@admin.register(ReportStatusHistory)
class ReportStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ('report', 'from_status', 'to_status', 'changed_by', 'created_at')
    list_filter = ('to_status',)
