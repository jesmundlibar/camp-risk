from django.urls import path

from . import views

urlpatterns = [
    path('dashboard/summary/', views.dashboard_summary, name='dashboard-summary'),
    path('reports/', views.report_list_create, name='report-list-create'),
    path('reports/<str:report_id>/', views.report_detail, name='report-detail'),
    path('reports/<str:report_id>/assessment/', views.report_assessment_upsert, name='report-assessment'),
    path('reports/<str:report_id>/request-info/', views.report_request_information, name='report-request-info'),
    path(
        'mitigation/actions/<str:action_ref>/extend-deadline/',
        views.mitigation_extend_deadline,
        name='mitigation-extend-deadline',
    ),
    path(
        'mitigation/reports/<str:report_id>/tracking/',
        views.mitigation_tracking_update,
        name='mitigation-tracking-update',
    ),
]
