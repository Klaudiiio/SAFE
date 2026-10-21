from django.urls import path

from .views import (
    current_user,
    csrf_token,
    demo_auth_config,
    health_check,
    login_view,
    logout_view,
    report_detail,
    report_list_create,
    signup,
)

urlpatterns = [
    path("health/", health_check, name="health-check"),
    path("auth/csrf/", csrf_token, name="auth-csrf"),
    path("auth/demo-config/", demo_auth_config, name="auth-demo-config"),
    path("auth/signup/", signup, name="auth-signup"),
    path("auth/login/", login_view, name="auth-login"),
    path("auth/logout/", logout_view, name="auth-logout"),
    path("auth/me/", current_user, name="auth-current-user"),
    path("reports/", report_list_create, name="report-list-create"),
    path("reports/<int:pk>/", report_detail, name="report-detail"),
]
