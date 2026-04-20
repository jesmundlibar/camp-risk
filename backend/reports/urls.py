from django.urls import path

from . import views

urlpatterns = [
    path('reports/', views.report_list_create, name='report-list-create'),
    path('reports/<str:report_id>/', views.report_detail, name='report-detail'),
]
