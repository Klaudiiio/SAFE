from django.conf import settings
from django.db import models


class AdminAccount(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="safe_admin_account",
        primary_key=True,
    )
    name = models.CharField(max_length=50, blank=True, default="")
    student_id = models.CharField(max_length=100, blank=True, default="")
    course = models.CharField(max_length=100, blank=True, default="")
    phone_number = models.CharField(max_length=20, blank=True, default="")
    username = models.CharField(max_length=150, blank=True, default="")
    user_type = models.CharField(max_length=20, default="admin")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_safe_admin_accounts",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["user__username"]
        db_table = "admin_accounts"

    def __str__(self):
        return self.user.get_username()


class DemoAccountProfile(models.Model):
    class AccountType(models.TextChoices):
        STUDENT = "student", "Student"
        VISITOR = "visitor", "Visitor"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="safe_profile",
        primary_key=True,
    )
    display_name = models.CharField(max_length=50, db_column="name")
    account_type = models.CharField(max_length=20, choices=AccountType.choices, db_column="user_type")
    student_id = models.CharField(max_length=100, blank=True, default="")
    course = models.CharField(max_length=100, blank=True, default="")
    phone_number = models.CharField(max_length=20, blank=True, default="")
    username = models.CharField(max_length=150, blank=True, default="")
    verification_status = models.CharField(max_length=30, default="demo_unverified")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "user_accounts"

    def __str__(self):
        return f"{self.display_name} ({self.account_type})"


class EmergencyReport(models.Model):
    class Severity(models.TextChoices):
        URGENT = "urgent", "Urgent"
        MINOR = "minor", "Minor"

    incident_id = models.CharField(max_length=80)
    incident_label = models.CharField(max_length=200)
    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.MINOR)
    building = models.CharField(max_length=100, blank=True, default="")
    floor = models.CharField(max_length=50, blank=True, default="")
    description = models.TextField(blank=True, default="")
    recording_notice_accepted = models.BooleanField(default=False)
    audio_enabled = models.BooleanField(default=True)
    video_enabled = models.BooleanField(default=True)
    status = models.CharField(max_length=30, default="submitted")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="emergency_reports",
    )
    response_eta_minutes = models.PositiveIntegerField(default=5)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        db_table = "emergency_reports"

    def __str__(self):
        return f"{self.incident_label} ({self.severity})"
