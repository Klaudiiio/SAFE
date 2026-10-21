from django.urls import path

from .views import health_check, report_detail, report_list_create

urlpatterns = [
    path("health/", health_check, name="health-check"),
    path("reports/", report_list_create, name="report-list-create"),
    path("reports/<int:pk>/", report_detail, name="report-detail"),
]
