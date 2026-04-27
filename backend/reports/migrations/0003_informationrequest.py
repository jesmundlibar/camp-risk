import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('reports', '0002_riskassessment_reportstatushistory'),
    ]

    operations = [
        migrations.CreateModel(
            name='InformationRequest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('payload', models.JSONField(default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                (
                    'created_by',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='information_requests_sent',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    'report',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='information_requests',
                        to='reports.incidentreport',
                    ),
                ),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
