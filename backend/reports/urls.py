from django.urls import path

from . import notifications_views, views

urlpatterns = [
    path('notifications/', notifications_views.notifications_list, name='notifications-list'),
    path(
        'notifications/read-all/',
        notifications_views.notifications_mark_all_read,
        name='notifications-read-all',
    ),
    path(
        'notifications/<int:notification_id>/read/',
        notifications_views.notifications_mark_read,
        name='notifications-read-one',
    ),
    path('dashboard/summary/', views.dashboard_summary, name='dashboard-summary'),
    path('reports/activity-log/', views.report_activity_log, name='report-activity-log'),
    path('reports/', views.report_list_create, name='report-list-create'),
    path('reports/<str:report_id>/update/', views.report_guard_update, name='report-guard-update'),
    path('reports/<str:report_id>/', views.report_detail, name='report-detail'),
    path('reports/<str:report_id>/assessment/', views.report_assessment_upsert, name='report-assessment'),
    path(
        'reports/<str:report_id>/assessment-pdf/',
        views.report_assessment_pdf,
        name='report-assessment-pdf',
    ),
    path('reports/<str:report_id>/request-info/', views.report_request_information, name='report-request-info'),
    path(
        'reports/<str:report_id>/extend-deadline/',
        views.report_extend_deadline,
        name='report-extend-deadline',
    ),
    path(
        'reports/<str:report_id>/mitigation/',
        views.report_mitigation_update,
        name='report-mitigation-update',
    ),
    path(
        'mitigation/actions/<str:action_ref>/extend-deadline/',
        views.mitigation_extend_deadline,
        name='mitigation-extend-deadline',
    ),
    path(
        'mitigation/actions/<str:action_ref>/complete/',
        views.mitigation_complete_action,
        name='mitigation-complete-action',
    ),
    path(
        'mitigation/reports/<str:report_id>/tracking/',
        views.mitigation_tracking_update,
        name='mitigation-tracking-update',
    ),
]
