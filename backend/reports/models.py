from django.conf import settings
from django.db import models


class DemoAccountProfile(models.Model):
    class AccountType(models.TextChoices):
        STUDENT = "student", "Student"
        VISITOR = "visitor", "Visitor"

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="safe_profile")
    display_name = models.CharField(max_length=100)
    account_type = models.CharField(max_length=20, choices=AccountType.choices)
    verification_status = models.CharField(max_length=30, default="demo_unverified")
    created_at = models.DateTimeField(auto_now_add=True)

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

    def __str__(self):
        return f"{self.incident_label} ({self.severity})"
