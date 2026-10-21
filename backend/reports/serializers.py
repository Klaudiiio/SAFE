from rest_framework import serializers

from .models import EmergencyReport


class EmergencyReportSerializer(serializers.ModelSerializer):
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
        ]
        read_only_fields = ["id", "status", "response_eta_minutes", "created_at", "updated_at"]
