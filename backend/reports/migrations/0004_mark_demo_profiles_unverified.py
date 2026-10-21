from django.db import migrations


def mark_demo_profiles_unverified(apps, schema_editor):
    profile_model = apps.get_model("reports", "DemoAccountProfile")
    profile_model.objects.filter(verification_status="demo_verified").update(
        verification_status="demo_unverified"
    )


class Migration(migrations.Migration):
    dependencies = [
        ("reports", "0003_alter_demoaccountprofile_verification_status"),
    ]

    operations = [
        migrations.RunPython(mark_demo_profiles_unverified, migrations.RunPython.noop),
    ]
