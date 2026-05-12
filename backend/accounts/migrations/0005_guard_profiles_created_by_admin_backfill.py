from django.db import migrations


def set_guard_created_by_admin(apps, schema_editor):
    UserProfile = apps.get_model('accounts', 'UserProfile')
    UserProfile.objects.filter(role='guard').update(created_by_admin=True)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0004_userprofile_personnel_plain_password'),
    ]

    operations = [
        migrations.RunPython(set_guard_created_by_admin, noop_reverse),
    ]
