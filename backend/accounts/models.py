from django.contrib.auth.models import User
from django.db import models


class UserProfile(models.Model):
    class Role(models.TextChoices):
        GUARD = 'guard', 'Guard'
        ADMIN = 'admin', 'Admin'

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.GUARD)
    created_by_admin = models.BooleanField(default=False)

    def __str__(self) -> str:
        return f'{self.user.username} ({self.role})'
