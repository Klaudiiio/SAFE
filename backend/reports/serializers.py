from rest_framework import serializers

from .models import (
    AdminAccount,
    CaseMessage,
    ClinicCaseNote,
    EmergencyReport,
    IncidentLog,
    IncidentNotification,
    IncidentType,
    Location,
    ResponderAccount,
    ResponderNotification,
)


class EmergencyReportSerializer(serializers.ModelSerializer):
    incident_id = serializers.SlugRelatedField(
        source="incident_type",
        slug_field="code",
        queryset=IncidentType.objects.all(),
    )
    incident_label = serializers.CharField(source="incident_type.incident_name", read_only=True)
    severity = serializers.CharField(source="incident_type.priority_level", read_only=True)
    building = serializers.CharField(write_only=True, required=False, allow_blank=True, max_length=50)
    floor = serializers.CharField(write_only=True, required=False, allow_blank=True, max_length=100)

    def create(self, validated_data):
        building = validated_data.pop("building", "").strip() or "Unknown"
        room = validated_data.pop("floor", "").strip()
        location, _ = Location.objects.get_or_create(building=building, room=room)
        return EmergencyReport.objects.create(location=location, **validated_data)

    def to_representation(self, instance):
        payload = super().to_representation(instance)
        payload["building"] = instance.location.building
        payload["floor"] = instance.location.room
        return payload

    class Meta:
        model = EmergencyReport
        fields = [
            "id",
            "incident_id",
            "incident_label",
            "severity",
            "building",
            "floor",
            "description",
            "recording_notice_accepted",
            "audio_enabled",
            "video_enabled",
            "status",
            "response_eta_minutes",
            "created_at",
            "updated_at",
            "resolved_at",
        ]
        read_only_fields = ["id", "status", "response_eta_minutes", "created_at", "updated_at", "resolved_at"]


class RecentIncidentHistorySerializer(serializers.ModelSerializer):
    incident_label = serializers.CharField(source="incident_type.incident_name", read_only=True)
    severity = serializers.CharField(source="incident_type.priority_level", read_only=True)
    building = serializers.CharField(source="location.building", read_only=True)
    floor = serializers.CharField(source="location.room", read_only=True)

    class Meta:
        model = EmergencyReport
        fields = ["id", "incident_label", "severity", "building", "floor", "status", "created_at"]


class IncidentTypeSerializer(serializers.ModelSerializer):
    def validate_priority_level(self, value):
        if value not in {"urgent", "minor"}:
            raise serializers.ValidationError("Choose urgent or minor priority.")
        return value

    class Meta:
        model = IncidentType
        fields = ["id", "code", "incident_name", "priority_level", "guidance"]


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = ["id", "building", "room", "latitude", "longitude"]


class IncidentLogSerializer(serializers.ModelSerializer):
    incident_id = serializers.IntegerField(source="incident.pk", read_only=True)
    incident_label = serializers.CharField(source="incident.incident_type.incident_name", read_only=True)
    admin_username = serializers.CharField(source="admin.username", read_only=True, default="")
    responder_name = serializers.CharField(source="responder.name", read_only=True, default="")

    class Meta:
        model = IncidentLog
        fields = [
            "id", "incident_id", "incident_label", "admin_username", "responder_name",
            "action_time", "remarks", "event_type",
        ]


class ResponderAccountSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    user_id = serializers.IntegerField(read_only=True)
    is_active = serializers.BooleanField(source="user.is_active", read_only=True)

    class Meta:
        model = ResponderAccount
        fields = [
            "user_id", "name", "department", "contact_number", "availability_status",
            "username", "email", "is_active", "user_type", "created_at",
        ]
        read_only_fields = ["user_id", "username", "email", "user_type", "created_at"]

    def validate_availability_status(self, value):
        if value not in ResponderAccount.Availability.values:
            raise serializers.ValidationError("Choose available, unavailable, or on_break.")
        return value


class ClinicCaseNoteSerializer(serializers.ModelSerializer):
    responder_name = serializers.CharField(source="responder.name", read_only=True, default="")

    class Meta:
        model = ClinicCaseNote
        fields = ["diagnosis", "doctor_notes", "vital_signs", "actions_taken", "responder_name", "updated_at"]
        read_only_fields = ["responder_name", "updated_at"]

    def validate_vital_signs(self, value):
        if not isinstance(value, dict) or len(value) > 12:
            raise serializers.ValidationError("Vital signs must be an object with at most 12 entries.")
        for key, item in value.items():
            if not isinstance(key, str) or len(key) > 40 or not isinstance(item, (str, int, float)):
                raise serializers.ValidationError("Each vital sign needs a short label and text or numeric value.")
            if len(str(item)) > 40:
                raise serializers.ValidationError("Vital sign values must be 40 characters or fewer.")
        return value

    def validate_actions_taken(self, value):
        if not isinstance(value, list) or len(value) > 30:
            raise serializers.ValidationError("Actions taken must be a list of at most 30 items.")
        if any(not isinstance(item, str) or not item.strip() or len(item) > 160 for item in value):
            raise serializers.ValidationError("Each action must be 1 to 160 characters.")
        return [item.strip() for item in value]


class CaseMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_role = serializers.SerializerMethodField()

    class Meta:
        model = CaseMessage
        fields = ["id", "message", "created_at", "sender_name", "sender_role"]
        read_only_fields = ["id", "created_at", "sender_name", "sender_role"]

    def get_sender_name(self, obj):
        responder = getattr(obj.sender, "safe_responder_account", None)
        profile = getattr(obj.sender, "safe_profile", None)
        admin = getattr(obj.sender, "safe_admin_account", None)
        return (responder.name if responder else None) or (
            profile.display_name if profile else None
        ) or (admin.name if admin else None) or obj.sender.get_username()

    def get_sender_role(self, obj):
        if ResponderAccount.objects.filter(user_id=obj.sender_id).exists():
            return "clinic"
        if AdminAccount.objects.filter(user_id=obj.sender_id).exists():
            return "admin"
        return "patient"


class IncidentNotificationSerializer(serializers.ModelSerializer):
    incident_id = serializers.IntegerField(source="notification.incident_id", read_only=True)
    incident_label = serializers.CharField(source="notification.incident.incident_type.incident_name", read_only=True)
    event_type = serializers.CharField(source="notification.event_type", read_only=True)
    message = serializers.CharField(source="notification.message", read_only=True)
    created_at = serializers.DateTimeField(source="notification.created_at", read_only=True)

    class Meta:
        model = ResponderNotification
        fields = ["id", "incident_id", "incident_label", "event_type", "message", "created_at", "status"]
