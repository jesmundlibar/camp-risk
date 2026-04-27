from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from accounts.models import UserProfile


class Command(BaseCommand):
    help = 'Create demo guard and admin users for local development (idempotent).'

    def handle(self, *args, **options):
        guard, created_g = User.objects.get_or_create(
            username='guard',
            defaults={
                'first_name': '',
                'last_name': '',
                'email': 'guard@xu.edu.ph',
            },
        )
        guard.first_name = ''
        guard.last_name = ''
        guard.set_password('guard123')
        guard.save()
        profile_g, _ = UserProfile.objects.get_or_create(user=guard, defaults={'role': UserProfile.Role.GUARD})
        profile_g.role = UserProfile.Role.GUARD
        profile_g.save()
        self.stdout.write(self.style.SUCCESS(f"Guard: username=guard password=guard123 ({'created' if created_g else 'updated'})"))

        admin_u, created_a = User.objects.get_or_create(
            username='admin',
            defaults={
                'first_name': 'Sir',
                'last_name': 'Apollo',
                'email': 'admin@xu.edu.ph',
                'is_staff': True,
            },
        )
        admin_u.set_password('admin123')
        admin_u.is_staff = True
        admin_u.save()
        profile_a, _ = UserProfile.objects.get_or_create(user=admin_u, defaults={'role': UserProfile.Role.ADMIN})
        profile_a.role = UserProfile.Role.ADMIN
        profile_a.save()
        self.stdout.write(self.style.SUCCESS(f"Admin: username=admin password=admin123 ({'created' if created_a else 'updated'})"))
