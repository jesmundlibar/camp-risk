from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_userprofile_created_by_admin'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='personnel_plain_password',
            field=models.CharField(blank=True, default='', max_length=256),
        ),
    ]
