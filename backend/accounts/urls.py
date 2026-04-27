from django.urls import path

from . import views

urlpatterns = [
    path('auth/login/', views.api_login, name='api-login'),
    path('auth/logout/', views.api_logout, name='api-logout'),
    path('auth/me/', views.api_me, name='api-me'),
    path('personnel/', views.personnel_list_create, name='api-personnel-list-create'),
    path('personnel/<int:user_id>/', views.personnel_delete, name='api-personnel-delete'),
]
