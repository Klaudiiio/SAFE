from rest_framework.permissions import BasePermission

from .models import AdminAccount, ResponderAccount


class IsAdminAccount(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return (
            bool(user and user.is_authenticated and user.is_active and user.is_staff)
            and AdminAccount.objects.filter(user_id=user.pk).exists()
        )


class IsResponderAccount(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return (
            bool(user and user.is_authenticated and user.is_active)
            and not user.is_staff
            and not AdminAccount.objects.filter(user_id=user.pk).exists()
            and ResponderAccount.objects.filter(user_id=user.pk).exists()
        )
