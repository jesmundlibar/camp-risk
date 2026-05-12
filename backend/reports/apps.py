from django.apps import AppConfig


class ReportsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'reports'
    verbose_name = 'Incident reports'

    def ready(self):
        # noqa: F401 — register signal handlers for optional Google Sheets backup
        from . import signals  # noqa: F401
