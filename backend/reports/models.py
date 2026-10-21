from django.db import models


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
    response_eta_minutes = models.PositiveIntegerField(default=5)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.incident_label} ({self.severity})"
