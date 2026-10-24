from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def add_existing_staff_accounts(apps, schema_editor):
    user_model = apps.get_model(*settings.AUTH_USER_MODEL.split("."))
    admin_account_model = apps.get_model("reports", "AdminAccount")
    database = schema_editor.connection.alias
    existing_ids = admin_account_model.objects.using(database).values_list("user_id", flat=True)
    admin_account_model.objects.using(database).bulk_create(
        [
            admin_account_model(user_id=user_id)
            for user_id in user_model.objects.using(database)
            .filter(is_staff=True)
            .exclude(pk__in=existing_ids)
            .values_list("pk", flat=True)
        ],
        ignore_conflicts=True,
    )


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("reports", "0004_mark_demo_profiles_unverified"),
    ]

    operations = [
        migrations.CreateModel(
            name="AdminAccount",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_safe_admin_accounts",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="safe_admin_account",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["user__username"]},
        ),
        migrations.RunPython(add_existing_staff_accounts, migrations.RunPython.noop),
    ]
