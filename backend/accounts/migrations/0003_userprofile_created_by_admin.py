from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_ensure_profiles_for_existing_users'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='created_by_admin',
            field=models.BooleanField(default=False),
        ),
    ]
