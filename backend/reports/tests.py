import json

from django.test import Client, TestCase, override_settings
from django.conf import settings
from django.contrib.auth import get_user_model

from .models import AdminAccount, DemoAccountProfile, EmergencyReport


@override_settings(DEBUG=True)
class DemoAuthenticationTests(TestCase):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)

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
                "incident_id": "demo-test",
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

        visitor_client = Client(enforce_csrf_checks=True)
        visitor_response = self.signup(
            email="visitor@example.test",
            account_type="visitor",
            client=visitor_client,
        )
        self.assertEqual(visitor_response.status_code, 201, visitor_response.content)
        self.assertEqual(visitor_client.get("/api/reports/").json(), [])
        self.assertEqual(visitor_client.get(f"/api/reports/{report_id}/").status_code, 404)

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
        self.report = EmergencyReport.objects.create(
            incident_id="demo-incident",
            incident_label="Fictional minor incident",
            severity="minor",
            building="Demo Hall",
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
