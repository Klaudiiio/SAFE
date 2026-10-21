import json

from django.test import Client, TestCase, override_settings
from django.conf import settings
from django.contrib.auth import get_user_model

from .models import DemoAccountProfile, EmergencyReport


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

    def test_signup_invalid_account_type_returns_specific_error(self):
        response = self.client.post(
            "/api/auth/signup/",
            data=json.dumps({
                "display_name": "Fictional Demo User",
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
