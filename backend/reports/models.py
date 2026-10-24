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


class IncidentType(models.Model):
    id = models.BigAutoField(primary_key=True, db_column="incident_types_id")
    code = models.SlugField(max_length=80, unique=True)
    incident_name = models.CharField(max_length=50)
    priority_level = models.CharField(max_length=100)
    guidance = models.CharField(max_length=200, blank=True, default="")

    class Meta:
        db_table = "incident_types"
        ordering = ["priority_level", "incident_name"]

    def __str__(self):
        return self.incident_name


class Location(models.Model):
    id = models.BigAutoField(primary_key=True, db_column="location_id")
    building = models.CharField(max_length=50)
    room = models.CharField(max_length=100, blank=True, default="")
    latitude = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    longitude = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)

    class Meta:
        db_table = "locations"
        ordering = ["building", "room"]
        constraints = [
            models.UniqueConstraint(fields=["building", "room"], name="unique_building_room"),
        ]

    def __str__(self):
        return f"{self.building}{f' · {self.room}' if self.room else ''}"


class EmergencyReport(models.Model):
    id = models.BigAutoField(primary_key=True, db_column="incident_id")
    incident_type = models.ForeignKey(
        IncidentType,
        on_delete=models.PROTECT,
        related_name="incidents",
        db_column="incident_types_id",
    )
    location = models.ForeignKey(
        Location,
        on_delete=models.PROTECT,
        related_name="incidents",
        db_column="location_id",
    )
    description = models.TextField(blank=True, default="")
    recording_notice_accepted = models.BooleanField(default=False)
    audio_enabled = models.BooleanField(default=True)
    video_enabled = models.BooleanField(default=True)
    status = models.CharField(max_length=100, default="submitted")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="emergency_reports",
    )
    response_eta_minutes = models.PositiveIntegerField(default=5)
    created_at = models.DateTimeField(auto_now_add=True, db_column="reported_at")
    resolved_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        db_table = "incidents"

    def __str__(self):
        return f"{self.incident_type} ({self.status})"


class ResponderAccount(models.Model):
    class Availability(models.TextChoices):
        AVAILABLE = "available", "Available"
        UNAVAILABLE = "unavailable", "Unavailable"
        ON_BREAK = "on_break", "On break"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="safe_responder_account",
        primary_key=True,
    )
    name = models.CharField(max_length=50)
    department = models.CharField(max_length=100)
    contact_number = models.CharField(max_length=20)
    availability_status = models.CharField(
        max_length=20,
        choices=Availability.choices,
        default=Availability.AVAILABLE,
    )
    username = models.CharField(max_length=150, unique=True)
    user_type = models.CharField(max_length=50, default="responder")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_safe_responders",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "responders"
        ordering = ["name", "username"]

    def __str__(self):
        return self.name


class IncidentNotification(models.Model):
    incident = models.ForeignKey(
        EmergencyReport,
        on_delete=models.CASCADE,
        related_name="notifications",
        db_column="incident_id",
    )
    event_type = models.CharField(max_length=50)
    message = models.CharField(max_length=240)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "incident_notifications"
        ordering = ["-created_at", "-id"]


class ResponderNotification(models.Model):
    class Status(models.TextChoices):
        NEW = "new", "New"
        READ = "read", "Read"

    id = models.BigAutoField(primary_key=True, db_column="responder_notification_id")
    notification = models.ForeignKey(
        IncidentNotification,
        on_delete=models.CASCADE,
        related_name="recipients",
        db_column="notification_id",
    )
    responder = models.ForeignKey(
        ResponderAccount,
        on_delete=models.CASCADE,
        related_name="notifications",
        db_column="responder_id",
    )
    assigned_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)

    class Meta:
        db_table = "responder_notifications"
        ordering = ["-assigned_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["notification", "responder"],
                name="unique_responder_incident_notification",
            ),
        ]


class ClinicCaseNote(models.Model):
    incident = models.OneToOneField(
        EmergencyReport,
        on_delete=models.CASCADE,
        related_name="clinic_note",
        db_column="incident_id",
    )
    responder = models.ForeignKey(
        ResponderAccount,
        on_delete=models.SET_NULL,
        null=True,
        related_name="case_notes",
        db_column="responder_id",
    )
    diagnosis = models.CharField(max_length=200, blank=True, default="")
    doctor_notes = models.TextField(blank=True, default="")
    vital_signs = models.JSONField(default=dict, blank=True)
    actions_taken = models.JSONField(default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "clinic_case_notes"


class CaseMessage(models.Model):
    incident = models.ForeignKey(
        EmergencyReport,
        on_delete=models.CASCADE,
        related_name="messages",
        db_column="incident_id",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="safe_case_messages",
    )
    message = models.TextField(max_length=3000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "case_messages"
        ordering = ["created_at", "id"]


class IncidentLog(models.Model):
    id = models.BigAutoField(primary_key=True, db_column="log_id")
    incident = models.ForeignKey(
        EmergencyReport,
        on_delete=models.CASCADE,
        related_name="logs",
        db_column="incident_id",
    )
    admin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="safe_incident_logs",
        db_column="admin_id",
    )
    responder = models.ForeignKey(
        "ResponderAccount",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="incident_logs",
        db_column="responder_id",
    )
    action_time = models.DateTimeField(auto_now_add=True)
    remarks = models.TextField(blank=True, default="")
    event_type = models.CharField(max_length=50)

    class Meta:
        db_table = "incident_logs"
        ordering = ["-action_time", "-id"]
