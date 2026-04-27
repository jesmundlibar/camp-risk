import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='RiskAssessment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('risk_classification', models.CharField(blank=True, max_length=128)),
                ('likelihood', models.PositiveSmallIntegerField()),
                ('severity', models.PositiveSmallIntegerField()),
                ('risk_score', models.PositiveSmallIntegerField()),
                ('risk_level', models.CharField(max_length=64)),
                ('engineering_controls', models.TextField(blank=True)),
                ('administrative_controls', models.TextField(blank=True)),
                ('ppe_controls', models.TextField(blank=True)),
                ('residual_risk', models.TextField(blank=True)),
                ('mitigation_actions', models.JSONField(default=list)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                (
                    'assessed_by',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='risk_assessments_done',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    'report',
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='risk_assessment',
                        to='reports.incidentreport',
                    ),
                ),
            ],
            options={
                'ordering': ['-updated_at'],
            },
        ),
        migrations.CreateModel(
            name='ReportStatusHistory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('from_status', models.CharField(blank=True, max_length=32)),
                ('to_status', models.CharField(max_length=32)),
                ('note', models.CharField(blank=True, max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                (
                    'changed_by',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    'report',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='status_history',
                        to='reports.incidentreport',
                    ),
                ),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
