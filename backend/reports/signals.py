from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import AdminAccount


@receiver(post_save, sender=get_user_model())
def create_admin_account_for_staff_user(sender, instance, created, **kwargs):
    if created and instance.is_staff:
        AdminAccount.objects.get_or_create(
            user=instance,
            defaults={
                "name": (instance.first_name or instance.get_username())[:50],
                "username": instance.get_username(),
            },
        )
