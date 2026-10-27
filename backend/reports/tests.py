import json
from datetime import timedelta

from django.test import Client, TestCase, override_settings
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone

from .models import (
    AdminAccount,
    CaseMessage,
    ClinicCaseNote,
    DemoAccountProfile,
    EmergencyReport,
    IncidentLog,
    IncidentNotification,
    IncidentType,
    Location,
    ResponderAccount,
    ResponderNotification,
)


@override_settings(DEBUG=True)
class DemoAuthenticationTests(TestCase):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)
        self.incident_type = IncidentType.objects.get_or_create(
            code="cardiac",
            defaults={
                "incident_name": "Cardiac Arrest / Collapse",
                "priority_level": "urgent",
                "guidance": "Emergency response",
            },
        )[0]

    def csrf_token(self, client=None):
        client = client or self.client
        response = client.get("/api/auth/csrf/")
        self.assertEqual(response.status_code, 200)
        return response.json()["csrf_token"]

    def signup(self, email="student@example.test", account_type="student", client=None, origin=None):
        client = client or self.client
        headers = {"HTTP_X_CSRFTOKEN": self.csrf_token(client)}
        if origin:
            headers["HTTP_ORIGIN"] = origin
        return client.post(
            "/api/auth/signup/",
            data=json.dumps({
                "display_name": "Fictional Demo User",
                "username": email.split("@")[0],
                "student_id": "DEMO-0001",
                "course": "Demo Studies",
                "phone_number": "+1-202-555-0199",
                "email": email,
                "password": "Fictional-Demo-Password-927!",
                "account_type": account_type,
            }),
            content_type="application/json",
            **headers,
        )

    def test_signup_accepts_origin_from_local_network(self):
        if not settings.LOCAL_NETWORK_CSRF_ORIGINS:
            self.skipTest("No local network interface was detected.")

        response = self.signup(origin=settings.LOCAL_NETWORK_CSRF_ORIGINS[0])

        self.assertEqual(response.status_code, 201, response.content)

    def test_student_signup_creates_session_and_profile(self):
        response = self.signup()

        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.json()["user"]["account_type"], "student")
        self.assertEqual(response.json()["user"]["username"], "student")
        self.assertEqual(response.json()["user"]["student_id"], "DEMO-0001")
        self.assertTrue(self.client.session.get("_auth_user_id"))
        self.assertEqual(DemoAccountProfile.objects.count(), 1)

    def test_signup_without_id_creates_unverified_demo_account(self):
        response = self.signup()

        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.json()["user"]["verification_status"], "demo_unverified")
        self.assertEqual(get_user_model().objects.count(), 1)

    def test_signup_requires_csrf_token(self):
        response = self.client.post(
            "/api/auth/signup/",
            data=json.dumps({
                "display_name": "Fictional Demo User",
                "username": "student",
                "student_id": "DEMO-0001",
                "course": "Demo Studies",
                "phone_number": "+1-202-555-0199",
                "email": "student@example.test",
                "password": "Fictional-Demo-Password-927!",
                "account_type": "student",
            }),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)

    def test_signup_invalid_email_returns_specific_error(self):
        response = self.signup(email="not-an-email")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "Enter a valid email address.")

    def test_signup_requires_profile_fields(self):
        response = self.client.post(
            "/api/auth/signup/",
            data=json.dumps({
                "display_name": "Fictional Demo User",
                "username": "student",
                "student_id": "DEMO-0001",
                "course": "Demo Studies",
                "phone_number": "",
                "email": "student@example.test",
                "password": "Fictional-Demo-Password-927!",
                "account_type": "student",
            }),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=self.csrf_token(),
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("phone number", response.json()["detail"])
        self.assertEqual(get_user_model().objects.count(), 0)

    def test_signup_invalid_account_type_returns_specific_error(self):
        response = self.client.post(
            "/api/auth/signup/",
            data=json.dumps({
                "display_name": "Fictional Demo User",
                "username": "student",
                "student_id": "DEMO-0001",
                "course": "Demo Studies",
                "phone_number": "+1-202-555-0199",
                "email": "student@example.test",
                "password": "Fictional-Demo-Password-927!",
                "account_type": [],
            }),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=self.csrf_token(),
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "Choose Student or Visitor.")

    def test_duplicate_signup_returns_specific_error(self):
        first_response = self.signup()
        self.assertEqual(first_response.status_code, 201, first_response.content)

        duplicate_response = self.signup()

        self.assertEqual(duplicate_response.status_code, 409)
        self.assertEqual(duplicate_response.json()["detail"], "An account with this email already exists.")

    def test_anonymous_user_cannot_read_or_create_reports(self):
        response = self.client.get("/api/reports/")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.client.get("/api/reports/recent/").status_code, 403)

        response = self.client.post(
            "/api/reports/",
            data=json.dumps({"incident_id": "demo", "incident_label": "Fake report", "severity": "minor"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(EmergencyReport.objects.count(), 0)

    def test_login_and_logout_manage_the_session(self):
        signup_response = self.signup()
        self.assertEqual(signup_response.status_code, 201, signup_response.content)
        self.client.logout()

        login_response = self.client.post(
            "/api/auth/login/",
            data=json.dumps({
                "email": "student@example.test",
                "password": "Fictional-Demo-Password-927!",
            }),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=self.csrf_token(),
        )
        self.assertEqual(login_response.status_code, 200, login_response.content)
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 200)

        logout_response = self.client.post(
            "/api/auth/logout/",
            HTTP_X_CSRFTOKEN=self.csrf_token(),
        )
        self.assertEqual(logout_response.status_code, 200)
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)

    def test_login_unknown_email_suggests_signup_in_demo_mode(self):
        response = self.client.post(
            "/api/auth/login/",
            data=json.dumps({"email": "missing@example.test", "password": "Fictional-Demo-Password-927!"}),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=self.csrf_token(),
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Choose Sign up", response.json()["detail"])

    def test_login_invalid_email_returns_specific_error(self):
        response = self.client.post(
            "/api/auth/login/",
            data=json.dumps({"email": "not-an-email", "password": "Fictional-Demo-Password-927!"}),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=self.csrf_token(),
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "Enter a valid email address.")

    def test_login_wrong_password_says_to_check_signup_password(self):
        self.assertEqual(self.signup().status_code, 201)

        response = self.client.post(
            "/api/auth/login/",
            data=json.dumps({"email": "student@example.test", "password": "Wrong-Fictional-Password-927!"}),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=self.csrf_token(),
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("does not match", response.json()["detail"])

    def test_reports_are_visible_only_to_their_owner(self):
        signup_response = self.signup()
        self.assertEqual(signup_response.status_code, 201, signup_response.content)

        report_response = self.client.post(
            "/api/reports/",
            data=json.dumps({
                "incident_id": "cardiac",
                "incident_label": "Fictional minor incident",
                "severity": "minor",
                "building": "Demo Hall",
                "floor": "Room 1",
                "description": "Synthetic test data.",
                "recording_notice_accepted": True,
                "audio_enabled": False,
                "video_enabled": False,
            }),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=self.csrf_token(),
        )
        self.assertEqual(report_response.status_code, 201, report_response.content)
        report_id = report_response.json()["id"]
        self.assertEqual(report_response.json()["incident_label"], self.incident_type.incident_name)
        self.assertEqual(report_response.json()["severity"], "urgent")
        self.assertEqual(report_response.json()["building"], "Demo Hall")
        self.assertEqual(report_response.json()["floor"], "Room 1")
        self.assertEqual(IncidentLog.objects.filter(incident_id=report_id, event_type="incident_reported").count(), 1)

        visitor_client = Client(enforce_csrf_checks=True)
        visitor_response = self.signup(
            email="visitor@example.test",
            account_type="visitor",
            client=visitor_client,
        )
        self.assertEqual(visitor_response.status_code, 201, visitor_response.content)
        visitor_user = get_user_model().objects.get(email="visitor@example.test")
        other_report = EmergencyReport.objects.create(
            incident_type=self.incident_type,
            location=EmergencyReport.objects.get(pk=report_id).location,
            description="Private details from another account.",
            created_by=visitor_user,
        )
        self.assertEqual(
            [item["id"] for item in visitor_client.get("/api/reports/").json()],
            [other_report.pk],
        )
        self.assertEqual(
            [item["id"] for item in self.client.get("/api/reports/").json()],
            [report_id],
        )
        self.assertEqual(visitor_client.get(f"/api/reports/{report_id}/").status_code, 404)

        recent_response = visitor_client.get("/api/reports/recent/")
        self.assertEqual(recent_response.status_code, 200)
        self.assertEqual({item["id"] for item in recent_response.json()}, {report_id, other_report.pk})
        for recent_report in recent_response.json():
            self.assertNotIn("description", recent_report)
            self.assertNotIn("reporter", recent_report)

        EmergencyReport.objects.filter(pk=report_id).update(created_at=timezone.now() - timedelta(days=8))
        recent_after_cutoff = visitor_client.get("/api/reports/recent/")
        self.assertEqual([item["id"] for item in recent_after_cutoff.json()], [other_report.pk])

        report = EmergencyReport.objects.get(pk=report_id)
        self.assertEqual(report.created_by.email, "student@example.test")


class AdminConsoleTests(TestCase):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)
        self.user = get_user_model().objects.create_user(
            username="demo-student",
            email="student@example.test",
            password="Fictional-Demo-Password-927!",
        )
        self.profile = DemoAccountProfile.objects.create(
            user=self.user,
            display_name="Fictional Demo User",
            account_type="student",
        )
        incident_type = IncidentType.objects.get_or_create(
            code="demo-incident",
            defaults={
                "incident_name": "Fictional minor incident",
                "priority_level": "minor",
                "guidance": "",
            },
        )[0]
        location = Location.objects.create(building="Demo Hall", room="")
        self.report = EmergencyReport.objects.create(
            incident_type=incident_type,
            location=location,
            description="Synthetic test data.",
            created_by=self.user,
        )
        self.staff = get_user_model().objects.create_user(
            username="demo-admin",
            email="admin@example.test",
            password="Fictional-Admin-Password-927!",
            is_staff=True,
        )

    def csrf_token(self):
        return self.client.get("/api/auth/csrf/").json()["csrf_token"]

    def test_admin_endpoints_reject_regular_users(self):
        self.client.force_login(self.user)

        response = self.client.get("/api/admin/reports/")

        self.assertEqual(response.status_code, 403)

    def test_admin_account_table_controls_admin_access(self):
        self.assertTrue(AdminAccount.objects.filter(user=self.staff).exists())
        AdminAccount.objects.filter(user=self.staff).delete()
        self.client.force_login(self.staff)

        response = self.client.get("/api/admin/session/")

        self.assertEqual(response.status_code, 403)

    def test_admin_login_requires_admin_account_record(self):
        AdminAccount.objects.filter(user=self.staff).delete()
        response = self.client.post(
            "/api/admin/login/",
            data=json.dumps({
                "username": "demo-admin",
                "password": "Fictional-Admin-Password-927!",
            }),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=self.csrf_token(),
        )

        self.assertEqual(response.status_code, 403)
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_only_staff_can_create_staff_accounts(self):
        response = self.client.post(
            "/api/admin/staff/",
            data=json.dumps({
                "username": "new-admin",
                "name": "New Demo Admin",
                "student_id": "ADMIN-0001",
                "course": "Demo Studies",
                "phone_number": "+1-202-555-0110",
                "email": "new-admin@example.test",
                "password": "Fictional-New-Admin-Password-927!",
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertFalse(get_user_model().objects.filter(username="new-admin").exists())

        self.client.force_login(self.staff)
        response = self.client.post(
            "/api/admin/staff/",
            data=json.dumps({
                "username": "new-admin",
                "name": "New Demo Admin",
                "student_id": "ADMIN-0001",
                "course": "Demo Studies",
                "phone_number": "+1-202-555-0110",
                "email": "new-admin@example.test",
                "password": "Fictional-New-Admin-Password-927!",
            }),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=self.csrf_token(),
        )

        self.assertEqual(response.status_code, 201, response.content)
        new_staff = get_user_model().objects.get(username="new-admin")
        self.assertTrue(new_staff.is_staff)
        self.assertFalse(new_staff.is_superuser)
        self.assertEqual(new_staff.email, "new-admin@example.test")
        admin_account = AdminAccount.objects.get(user=new_staff)
        self.assertEqual(admin_account.created_by, self.staff)
        self.assertEqual(admin_account.name, "New Demo Admin")
        self.assertEqual(admin_account.student_id, "ADMIN-0001")
        self.assertEqual(admin_account.course, "Demo Studies")
        self.assertEqual(admin_account.phone_number, "+1-202-555-0110")
        self.assertEqual(admin_account.username, "new-admin")
        self.assertEqual(admin_account.user_type, "admin")

    def test_staff_account_requires_all_profile_fields(self):
        self.client.force_login(self.staff)
        response = self.client.post(
            "/api/admin/staff/",
            data=json.dumps({
                "username": "new-admin",
                "name": "New Demo Admin",
                "student_id": "ADMIN-0001",
                "course": "",
                "phone_number": "+1-202-555-0110",
                "email": "new-admin@example.test",
                "password": "Fictional-New-Admin-Password-927!",
            }),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=self.csrf_token(),
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("course", response.json()["detail"])
        self.assertFalse(get_user_model().objects.filter(username="new-admin").exists())

    def test_staff_signup_rejects_weak_password(self):
        self.client.force_login(self.staff)
        response = self.client.post(
            "/api/admin/staff/",
            data=json.dumps({
                "username": "new-admin",
                "name": "New Demo Admin",
                "student_id": "ADMIN-0001",
                "course": "Demo Studies",
                "phone_number": "+1-202-555-0110",
                "email": "new-admin@example.test",
                "password": "123",
            }),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=self.csrf_token(),
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(get_user_model().objects.filter(username="new-admin").exists())

    def test_staff_login_and_report_update(self):
        response = self.client.post(
            "/api/admin/login/",
            data=json.dumps({"username": "demo-admin", "password": "Fictional-Admin-Password-927!"}),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=self.csrf_token(),
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(self.client.get("/api/admin/session/").status_code, 200)

        reports = self.client.get("/api/admin/reports/")
        self.assertEqual(reports.status_code, 200)
        self.assertEqual(len(reports.json()), 1)
        self.assertEqual(reports.json()[0]["reporter"]["email"], "student@example.test")

        update_response = self.client.patch(
            f"/api/admin/reports/{self.report.pk}/",
            data=json.dumps({"status": "in_progress", "response_eta_minutes": 12}),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=self.csrf_token(),
        )
        self.assertEqual(update_response.status_code, 200, update_response.content)
        self.report.refresh_from_db()
        self.assertEqual(self.report.status, "in_progress")
        self.assertEqual(self.report.response_eta_minutes, 12)
        self.assertEqual(IncidentLog.objects.filter(incident=self.report, admin=self.staff).count(), 2)
        activity = self.client.get("/api/admin/incident-logs/")
        self.assertEqual(activity.status_code, 200)
        self.assertEqual(activity.json()[0]["admin_username"], self.staff.username)
        self.assertEqual(activity.json()[0]["incident_label"], "Fictional minor incident")

    def test_resolving_report_sets_timestamp_and_logs_status_change(self):
        self.client.force_login(self.staff)
        response = self.client.patch(
            f"/api/admin/reports/{self.report.pk}/",
            data=json.dumps({"status": "resolved"}),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=self.csrf_token(),
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.report.refresh_from_db()
        self.assertIsNotNone(self.report.resolved_at)
        log = IncidentLog.objects.get(incident=self.report, event_type="status_changed")
        self.assertEqual(log.admin, self.staff)

    def test_admin_can_manage_incident_types_and_locations(self):
        self.client.force_login(self.staff)
        type_response = self.client.post(
            "/api/admin/incident-types/",
            data=json.dumps({
                "code": "test-category",
                "incident_name": "Test category",
                "priority_level": "minor",
                "guidance": "Synthetic guidance",
            }),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=self.csrf_token(),
        )
        self.assertEqual(type_response.status_code, 201, type_response.content)
        type_id = type_response.json()["id"]
        patch_response = self.client.patch(
            f"/api/admin/incident-types/{type_id}/",
            data=json.dumps({"priority_level": "urgent"}),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=self.csrf_token(),
        )
        self.assertEqual(patch_response.status_code, 200, patch_response.content)
        self.assertEqual(patch_response.json()["priority_level"], "urgent")

        location_response = self.client.post(
            "/api/admin/locations/",
            data=json.dumps({"building": "Test Building", "room": "Room 9"}),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=self.csrf_token(),
        )
        self.assertEqual(location_response.status_code, 201, location_response.content)
        self.assertIsNone(location_response.json()["latitude"])
        self.assertEqual(
            self.client.delete(
                f"/api/admin/locations/{location_response.json()['id']}/",
                HTTP_X_CSRFTOKEN=self.csrf_token(),
            ).status_code,
            204,
        )
        self.assertEqual(
            self.client.delete(
                f"/api/admin/incident-types/{type_id}/",
                HTTP_X_CSRFTOKEN=self.csrf_token(),
            ).status_code,
            204,
        )

    def test_incident_type_catalog_is_public_and_admin_logs_are_staff_only(self):
        type_response = self.client.get("/api/incident-types/")
        self.assertEqual(type_response.status_code, 200)
        self.assertTrue(any(item["code"] == "demo-incident" for item in type_response.json()))
        self.assertEqual(self.client.get("/api/admin/incident-logs/").status_code, 403)

        IncidentLog.objects.create(
            incident=self.report,
            event_type="incident_reported",
            remarks="Synthetic initial report.",
        )
        self.client.force_login(self.staff)
        response = self.client.get("/api/admin/incident-logs/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()[0]["admin_username"], "")

    def test_catalog_entries_in_use_cannot_be_deleted(self):
        self.client.force_login(self.staff)
        type_response = self.client.delete(
            f"/api/admin/incident-types/{self.report.incident_type_id}/",
            HTTP_X_CSRFTOKEN=self.csrf_token(),
        )
        location_response = self.client.delete(
            f"/api/admin/locations/{self.report.location_id}/",
            HTTP_X_CSRFTOKEN=self.csrf_token(),
        )

        self.assertEqual(type_response.status_code, 409)
        self.assertEqual(location_response.status_code, 409)

    def test_staff_can_manage_demo_account_access(self):
        self.client.force_login(self.staff)
        response = self.client.patch(
            f"/api/admin/users/{self.user.pk}/",
            data=json.dumps({"verification_status": "demo_verified", "is_active": False}),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=self.csrf_token(),
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.profile.refresh_from_db()
        self.user.refresh_from_db()
        self.assertEqual(self.profile.verification_status, "demo_verified")
        self.assertFalse(self.user.is_active)

    def test_admin_report_update_rejects_invalid_eta(self):
        self.client.force_login(self.staff)
        response = self.client.patch(
            f"/api/admin/reports/{self.report.pk}/",
            data=json.dumps({"response_eta_minutes": -1}),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=self.csrf_token(),
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(EmergencyReport.objects.get(pk=self.report.pk).response_eta_minutes, 5)


class ClinicStaffTests(TestCase):
    def setUp(self):
        self.client = Client()
        user_model = get_user_model()
        self.patient = user_model.objects.create_user(
            username="clinic-patient",
            email="patient@example.test",
            password="Fictional-Patient-Password-927!",
        )
        DemoAccountProfile.objects.create(
            user=self.patient,
            display_name="Demo Patient",
            account_type="student",
            phone_number="+1-202-555-0199",
        )
        self.admin = user_model.objects.create_user(
            username="clinic-admin",
            email="clinic-admin@example.test",
            password="Fictional-Admin-Password-927!",
            is_staff=True,
        )
        self.responder_user = user_model.objects.create_user(
            username="clinic-responder",
            email="responder@example.test",
            password="Fictional-Responder-Password-927!",
        )
        self.responder = ResponderAccount.objects.create(
            user=self.responder_user,
            name="Demo Responder",
            department="Campus Clinic",
            contact_number="+1-202-555-0144",
            username="clinic-responder",
            created_by=self.admin,
        )
        self.incident_type = IncidentType.objects.create(
            code="clinic-test",
            incident_name="Demo medical incident",
            priority_level="urgent",
            guidance="Follow clinic response procedures.",
        )
        self.location = Location.objects.create(building="Demo Clinic", room="Room 2")
        self.incident = EmergencyReport.objects.create(
            incident_type=self.incident_type,
            location=self.location,
            description="Synthetic test case.",
            created_by=self.patient,
        )

    def test_responder_access_is_separate_from_admin_and_patient_access(self):
        self.client.force_login(self.responder_user)
        self.assertEqual(self.client.get("/api/clinic/session/").status_code, 200)
        self.assertEqual(self.client.get("/api/clinic/cases/").status_code, 200)
        self.assertEqual(self.client.get("/api/admin/session/").status_code, 403)
        current_user = self.client.get("/api/auth/me/")
        self.assertEqual(current_user.status_code, 200)
        self.assertEqual(current_user.json()["user"]["user_type"], "clinic_staff")
        self.assertEqual(self.client.get("/api/clinic/session/").status_code, 200)

        self.client.force_login(self.patient)
        self.assertEqual(self.client.get("/api/clinic/cases/").status_code, 403)
        self.assertEqual(self.client.get("/api/clinic/dashboard/").status_code, 403)

    def test_responder_login_requires_responder_profile_and_keeps_user_non_staff(self):
        response = self.client.post(
            "/api/clinic/login/",
            data=json.dumps({"username": "clinic-responder", "password": "Fictional-Responder-Password-927!"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.responder_user.refresh_from_db()
        self.assertFalse(self.responder_user.is_staff)
        self.assertEqual(response.json()["department"], "Campus Clinic")

    def test_shared_app_login_returns_responder_role_and_session_profile(self):
        response = self.client.post(
            "/api/auth/login/",
            data=json.dumps({
                "identifier": "clinic-responder",
                "password": "Fictional-Responder-Password-927!",
            }),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["user"]["user_type"], "clinic_staff")
        self.assertEqual(response.json()["user"]["department"], "Campus Clinic")
        current_user = self.client.get("/api/auth/me/")
        self.assertEqual(current_user.status_code, 200, current_user.content)
        self.assertEqual(current_user.json()["user"]["user_type"], "clinic_staff")
        self.assertEqual(self.client.get("/api/clinic/session/").status_code, 200)

    def test_admin_can_create_responder_as_non_staff_with_password_hash(self):
        self.client.force_login(self.admin)
        response = self.client.post(
            "/api/admin/responders/",
            data=json.dumps({
                "username": "new-clinic-responder",
                "name": "New Responder",
                "email": "new-responder@example.test",
                "department": "Campus Clinic",
                "contact_number": "+1-202-555-0188",
                "password": "Fictional-New-Responder-Password-927!",
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        created_user = get_user_model().objects.get(username="new-clinic-responder")
        self.assertFalse(created_user.is_staff)
        self.assertNotEqual(created_user.password, "Fictional-New-Responder-Password-927!")
        self.assertTrue(created_user.check_password("Fictional-New-Responder-Password-927!"))
        self.assertTrue(ResponderAccount.objects.filter(user=created_user, created_by=self.admin).exists())

    def test_responder_case_workflow_notes_messages_and_ambulance_record(self):
        self.client.force_login(self.responder_user)
        action_response = self.client.post(
            f"/api/clinic/cases/{self.incident.pk}/actions/",
            data=json.dumps({"action": "accept"}),
            content_type="application/json",
        )
        self.assertEqual(action_response.status_code, 200, action_response.content)
        self.assertEqual(action_response.json()["case"]["status"], "acknowledged")

        note_response = self.client.put(
            f"/api/clinic/cases/{self.incident.pk}/notes/",
            data=json.dumps({
                "diagnosis": "Assessment recorded",
                "doctor_notes": "Synthetic clinical note.",
                "vital_signs": {"pulse": 78},
                "actions_taken": ["Initial assessment"],
            }),
            content_type="application/json",
        )
        self.assertEqual(note_response.status_code, 200, note_response.content)
        self.assertEqual(ClinicCaseNote.objects.get(incident=self.incident).responder, self.responder)

        message_response = self.client.post(
            f"/api/clinic/cases/{self.incident.pk}/messages/",
            data=json.dumps({"message": "Please confirm your current location."}),
            content_type="application/json",
        )
        self.assertEqual(message_response.status_code, 201, message_response.content)
        self.assertEqual(message_response.json()["sender_role"], "clinic")

        ambulance_response = self.client.post(
            f"/api/clinic/cases/{self.incident.pk}/actions/",
            data=json.dumps({"action": "request_ambulance"}),
            content_type="application/json",
        )
        self.assertEqual(ambulance_response.status_code, 200, ambulance_response.content)
        self.assertTrue(IncidentLog.objects.filter(
            incident=self.incident,
            responder=self.responder,
            event_type="ambulance_requested",
        ).exists())
        self.assertTrue(IncidentNotification.objects.filter(
            incident=self.incident,
            event_type="ambulance_requested",
        ).exists())

    def test_case_messages_are_limited_to_the_patient_and_responders(self):
        self.client.force_login(self.patient)
        sent = self.client.post(
            f"/api/reports/{self.incident.pk}/messages/",
            data=json.dumps({"message": "I am at the clinic entrance."}),
            content_type="application/json",
        )
        self.assertEqual(sent.status_code, 201, sent.content)
        self.assertEqual(sent.json()["sender_role"], "patient")
        self.assertEqual(ResponderNotification.objects.filter(responder=self.responder).count(), 1)

        other_user = get_user_model().objects.create_user(
            username="other-patient",
            email="other-patient@example.test",
            password="Fictional-Other-Password-927!",
        )
        self.client.force_login(other_user)
        self.assertEqual(self.client.get(f"/api/reports/{self.incident.pk}/messages/").status_code, 404)

        self.client.force_login(self.responder_user)
        conversation = self.client.get(f"/api/clinic/cases/{self.incident.pk}/messages/")
        self.assertEqual(conversation.status_code, 200)
        self.assertEqual(len(conversation.json()), 1)

    def test_new_report_broadcasts_an_in_app_notification(self):
        self.client.force_login(self.patient)
        response = self.client.post(
            "/api/reports/",
            data=json.dumps({
                "incident_id": self.incident_type.code,
                "building": "Demo Hall",
                "floor": "Room 4",
                "description": "Synthetic new report.",
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        notification = ResponderNotification.objects.get(responder=self.responder)
        self.assertEqual(notification.notification.incident_id, response.json()["id"])
        self.assertEqual(notification.status, ResponderNotification.Status.NEW)
