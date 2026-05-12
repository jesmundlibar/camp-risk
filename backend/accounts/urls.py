from django.urls import path

from . import views

urlpatterns = [
    path('admin/google-sheets-backup/', views.api_google_sheets_backup_info, name='api-google-sheets-backup'),
    path('auth/login/', views.api_login, name='api-login'),
    path('auth/logout/', views.api_logout, name='api-logout'),
    path('auth/me/', views.api_me, name='api-me'),
    path('personnel/', views.personnel_list_create, name='api-personnel-list-create'),
    path('personnel/<int:user_id>/', views.personnel_detail, name='api-personnel-detail'),
]
