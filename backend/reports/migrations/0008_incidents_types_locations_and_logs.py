from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
from django.utils.text import slugify


DEFAULT_TYPES = [
    ("cardiac", "Cardiac Arrest / Collapse", "urgent", "Unconscious, not breathing normally, no pulse"),
    ("breathing", "Severe Difficulty Breathing", "urgent", "Asthma attack, choking, turning blue"),
    ("seizure", "Seizure Lasting >5 Minutes", "urgent", "Repeated seizures or not waking up afterward"),
    ("anaphylaxis", "Anaphylaxis (Severe Allergy)", "urgent", "Swollen throat, wheezing, or collapse after exposure"),
    ("bleeding", "Severe Bleeding", "urgent", "Blood soaking clothing or spurting from a wound"),
    ("unconscious", "Unconscious / Unresponsive Student", "urgent", "Fainting that does not resolve quickly"),
    ("stroke", "Suspected Stroke", "urgent", "Face drooping, arm weakness, speech difficulty"),
    ("headneck", "Major Head or Neck Injury", "urgent", "Fall from height, sports collision, possible spinal injury"),
    ("burns", "Severe Burns", "urgent", "Electrical burns, large-area burns, facial burns"),
    ("poisoning", "Poisoning / Overdose", "urgent", "Ingesting chemicals, medications, or unknown substances"),
    ("cuts", "Small Cuts or Abrasions", "minor", "Clean and bandage"),
    ("sprain", "Minor Sprain or Strain", "minor", "Rest, ice, compression"),
    ("dizziness", "Brief Dizziness", "minor", "Hydration and observation"),
    ("fever", "Mild Fever", "minor", "Clinic assessment"),
    ("headache", "Headache", "minor", "Rest and evaluation"),
    ("stomach", "Stomachache / Nausea", "minor", "Observe and hydrate"),
    ("nosebleed", "Nosebleed", "minor", "First aid and monitoring"),
    ("rash", "Minor Allergic Rash", "minor", "Monitor for worsening symptoms"),
    ("bruise", "Small Bruise", "minor", "Ice pack and rest"),
    ("dehydration", "Mild Dehydration", "minor", "Fluids and observation"),
]


def migrate_existing_incidents(apps, schema_editor):
    Incident = apps.get_model("reports", "EmergencyReport")
    IncidentType = apps.get_model("reports", "IncidentType")
    Location = apps.get_model("reports", "Location")
    database = schema_editor.connection.alias

    for code, name, priority, guidance in DEFAULT_TYPES:
        IncidentType.objects.using(database).get_or_create(
            code=code,
            defaults={"incident_name": name, "priority_level": priority, "guidance": guidance},
        )

    for incident in Incident.objects.using(database).all().iterator():
        code = slugify(incident.legacy_incident_code)[:80] or f"legacy-incident-{incident.pk}"
        if IncidentType.objects.using(database).filter(code=code).exists():
            incident_type = IncidentType.objects.using(database).get(code=code)
        else:
            incident_type = IncidentType.objects.using(database).create(
                code=code,
                incident_name=(incident.incident_label or "Legacy incident")[:50],
                priority_level="urgent" if incident.severity == "urgent" else "minor",
                guidance="",
            )
        building = (incident.building or "Unknown")[:50]
        room = (incident.floor or "")[:100]
        location, _ = Location.objects.using(database).get_or_create(
            building=building,
            room=room,
        )
        incident.incident_type_id = incident_type.pk
        incident.location_id = location.pk
        incident.save(using=database, update_fields=["incident_type", "location"])


def restore_legacy_incidents(apps, schema_editor):
    Incident = apps.get_model("reports", "EmergencyReport")
    database = schema_editor.connection.alias

    for incident in Incident.objects.using(database).select_related("incident_type", "location").iterator():
        incident.legacy_incident_code = incident.incident_type.code[:50]
        incident.incident_label = incident.incident_type.incident_name
        incident.severity = incident.incident_type.priority_level
        incident.building = incident.location.building
        incident.floor = incident.location.room
        incident.save(
            using=database,
            update_fields=["legacy_incident_code", "incident_label", "severity", "building", "floor"],
        )


class Migration(migrations.Migration):
    dependencies = [
        ("reports", "0007_rename_tables_for_clarity"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="IncidentType",
            fields=[
                ("id", models.BigAutoField(db_column="incident_types_id", primary_key=True, serialize=False)),
                ("code", models.SlugField(max_length=80, unique=True)),
                ("incident_name", models.CharField(max_length=50)),
                ("priority_level", models.CharField(max_length=100)),
                ("guidance", models.CharField(blank=True, default="", max_length=200)),
            ],
            options={"db_table": "incident_types", "ordering": ["priority_level", "incident_name"]},
        ),
        migrations.CreateModel(
            name="Location",
            fields=[
                ("id", models.BigAutoField(db_column="location_id", primary_key=True, serialize=False)),
                ("building", models.CharField(max_length=50)),
                ("room", models.CharField(blank=True, default="", max_length=100)),
                ("latitude", models.DecimalField(blank=True, decimal_places=8, max_digits=10, null=True)),
                ("longitude", models.DecimalField(blank=True, decimal_places=8, max_digits=11, null=True)),
            ],
            options={
                "db_table": "locations",
                "ordering": ["building", "room"],
                "constraints": [models.UniqueConstraint(fields=("building", "room"), name="unique_building_room")],
            },
        ),
        migrations.AddField(
            model_name="emergencyreport",
            name="resolved_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RenameField(
            model_name="emergencyreport",
            old_name="incident_id",
            new_name="legacy_incident_code",
        ),
        migrations.AlterField(
            model_name="emergencyreport",
            name="id",
            field=models.BigAutoField(db_column="incident_id", primary_key=True, serialize=False),
        ),
        migrations.AlterField(
            model_name="emergencyreport",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, db_column="reported_at"),
        ),
        migrations.AlterField(
            model_name="emergencyreport",
            name="status",
            field=models.CharField(default="submitted", max_length=100),
        ),
        migrations.AlterModelTable(name="emergencyreport", table="incidents"),
        migrations.AddField(
            model_name="emergencyreport",
            name="incident_type",
            field=models.ForeignKey(
                db_column="incident_types_id",
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="incidents",
                to="reports.incidenttype",
            ),
        ),
        migrations.AddField(
            model_name="emergencyreport",
            name="location",
            field=models.ForeignKey(
                db_column="location_id",
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="incidents",
                to="reports.location",
            ),
        ),
        migrations.RunPython(migrate_existing_incidents, restore_legacy_incidents),
        migrations.RemoveField(model_name="emergencyreport", name="building"),
        migrations.RemoveField(model_name="emergencyreport", name="floor"),
        migrations.RemoveField(model_name="emergencyreport", name="legacy_incident_code"),
        migrations.RemoveField(model_name="emergencyreport", name="incident_label"),
        migrations.RemoveField(model_name="emergencyreport", name="severity"),
        migrations.AlterField(
            model_name="emergencyreport",
            name="incident_type",
            field=models.ForeignKey(
                db_column="incident_types_id",
                on_delete=django.db.models.deletion.PROTECT,
                related_name="incidents",
                to="reports.incidenttype",
            ),
        ),
        migrations.AlterField(
            model_name="emergencyreport",
            name="location",
            field=models.ForeignKey(
                db_column="location_id",
                on_delete=django.db.models.deletion.PROTECT,
                related_name="incidents",
                to="reports.location",
            ),
        ),
        migrations.CreateModel(
            name="IncidentLog",
            fields=[
                ("id", models.BigAutoField(db_column="log_id", primary_key=True, serialize=False)),
                ("action_time", models.DateTimeField(auto_now_add=True)),
                ("remarks", models.TextField(blank=True, default="")),
                ("event_type", models.CharField(max_length=50)),
                (
                    "admin",
                    models.ForeignKey(
                        blank=True,
                        db_column="admin_id",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="safe_incident_logs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "incident",
                    models.ForeignKey(
                        db_column="incident_id",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="logs",
                        to="reports.emergencyreport",
                    ),
                ),
            ],
            options={"db_table": "incident_logs", "ordering": ["-action_time", "-id"]},
        ),
    ]
