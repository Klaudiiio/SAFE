import json
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import IntegrityError, models, transaction
from django.db.models.deletion import ProtectedError
from django.utils import timezone
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

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
from .permissions import IsAdminAccount, IsResponderAccount
from .serializers import (
    CaseMessageSerializer,
    ClinicCaseNoteSerializer,
    EmergencyReportSerializer,
    IncidentNotificationSerializer,
    IncidentLogSerializer,
    IncidentTypeSerializer,
    LocationSerializer,
    RecentIncidentHistorySerializer,
    ResponderAccountSerializer,
)


User = get_user_model()


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    return Response({
        "status": "ok",
        "service": "SAFE backend",
        "message": "Django API is running and connected to the SAFE emergency workflow.",
    })


@require_GET
@ensure_csrf_cookie
def csrf_token(request):
    return JsonResponse({"csrf_token": get_token(request)})


@require_GET
def demo_auth_config(request):
    if not settings.DEBUG:
        return JsonResponse({"demo_mode": False})

    return JsonResponse({"demo_mode": True})


def _profile_payload(user):
    profile = user.safe_profile
    return {
        "id": user.pk,
        "email": user.email,
        "display_name": profile.display_name,
        "name": profile.display_name,
        "student_id": profile.student_id,
        "course": profile.course,
        "phone_number": profile.phone_number,
        "username": profile.username or user.get_username(),
        "account_type": profile.account_type,
        "user_type": profile.account_type,
        "verification_status": profile.verification_status,
    }


def _responder_payload(account):
    return {
        "id": account.user_id,
        "username": account.username,
        "name": account.name,
        "department": account.department,
        "contact_number": account.contact_number,
        "email": account.user.email,
        "user_type": "clinic_staff",
    }


def _authenticated_user_payload(user):
    try:
        return _profile_payload(user)
    except DemoAccountProfile.DoesNotExist:
        account = ResponderAccount.objects.select_related("user").filter(user=user).first()
        return _responder_payload(account) if account else None


def _request_json(request):
    try:
        return json.loads(request.body or "{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None


@csrf_protect
@require_POST
@transaction.atomic
def signup(request):
    if not settings.DEBUG:
        return JsonResponse({"detail": "Demo signup is disabled outside local development."}, status=403)

    data = _request_json(request)
    if not isinstance(data, dict):
        return JsonResponse({"detail": "Send a valid JSON request."}, status=400)

    display_name = data.get("display_name", "")
    username = data.get("username", "")
    student_id = data.get("student_id", "")
    course = data.get("course", "")
    phone_number = data.get("phone_number", "")
    email = data.get("email", "")
    password = data.get("password", "")
    account_type = data.get("account_type", "")

    if not isinstance(display_name, str):
        return JsonResponse({"detail": "Enter a name of 1 to 50 characters."}, status=400)
    display_name = display_name.strip()
    if not display_name or len(display_name) > 50:
        return JsonResponse({"detail": "Enter a name of 1 to 50 characters."}, status=400)
    if not isinstance(username, str):
        return JsonResponse({"detail": "Enter a valid username of 1 to 150 characters."}, status=400)
    username = username.strip()
    if not username or len(username) > 150:
        return JsonResponse({"detail": "Enter a valid username of 1 to 150 characters."}, status=400)
    try:
        UnicodeUsernameValidator()(username)
    except ValidationError:
        return JsonResponse({"detail": "Enter a valid username."}, status=400)
    account_fields = {
        "student ID": (student_id, 100),
        "course": (course, 100),
        "phone number": (phone_number, 20),
    }
    for label, (value, max_length) in account_fields.items():
        if not isinstance(value, str) or not value.strip() or len(value.strip()) > max_length:
            return JsonResponse({"detail": f"Enter a {label} of 1 to {max_length} characters."}, status=400)
    student_id = student_id.strip()
    course = course.strip()
    phone_number = phone_number.strip()
    if not isinstance(email, str):
        return JsonResponse({"detail": "Enter a valid email address."}, status=400)
    email = email.strip().lower()
    try:
        validate_email(email)
    except ValidationError:
        return JsonResponse({"detail": "Enter a valid email address."}, status=400)
    if not isinstance(account_type, str) or account_type not in {
        DemoAccountProfile.AccountType.STUDENT,
        DemoAccountProfile.AccountType.VISITOR,
    }:
        return JsonResponse({"detail": "Choose Student or Visitor."}, status=400)
    if not isinstance(password, str) or not password:
        return JsonResponse({"detail": "Enter a password."}, status=400)

    if User.objects.filter(email__iexact=email).exists():
        return JsonResponse({"detail": "An account with this email already exists."}, status=409)
    if User.objects.filter(username__iexact=username).exists():
        return JsonResponse({"detail": "An account with this username already exists."}, status=409)

    user = User(username=username, email=email, first_name=display_name)
    try:
        validate_password(password, user=user)
    except ValidationError as error:
        return JsonResponse({"detail": "Choose a stronger password.", "password_errors": error.messages}, status=400)

    try:
        user.set_password(password)
        user.save()
        DemoAccountProfile.objects.create(
            user=user,
            display_name=display_name,
            account_type=account_type,
            student_id=student_id,
            course=course,
            phone_number=phone_number,
            username=username,
        )
    except IntegrityError:
        return JsonResponse({"detail": "An account with this email already exists."}, status=409)

    login(request, user)
    return JsonResponse({"user": _profile_payload(user)}, status=201)


@csrf_protect
@require_POST
def login_view(request):
    data = _request_json(request)
    if not isinstance(data, dict):
        return JsonResponse({"detail": "Send a valid JSON request."}, status=400)

    identifier = data.get("identifier", data.get("email", data.get("username", "")))
    password = data.get("password", "")
    if not isinstance(identifier, str):
        return JsonResponse({"detail": "Enter a valid email address."}, status=400)
    identifier = identifier.strip()
    is_email = "@" in identifier or "email" in data
    if is_email:
        identifier = identifier.lower()
        try:
            validate_email(identifier)
        except ValidationError:
            return JsonResponse({"detail": "Enter a valid email address."}, status=400)
    if not isinstance(password, str) or not password:
        return JsonResponse({"detail": "Enter your password."}, status=400)
    account = (
        User.objects.filter(email__iexact=identifier).first()
        if is_email
        else User.objects.filter(username__iexact=identifier).first()
    )
    user = authenticate(
        request,
        username=account.get_username() if account else identifier,
        password=password,
    )
    if user is None or not user.is_active:
        detail = "Email, username, or password is incorrect."
        if settings.DEBUG:
            existing_user = account
            if existing_user is None:
                if is_email:
                    detail = "No demo account exists for this email. Choose Sign up to create one first."
            elif not existing_user.check_password(password):
                detail = "That password does not match this account. Passwords are case-sensitive; use the exact password from signup."
            elif not existing_user.is_active:
                detail = "This account is disabled. Contact the demo administrator."
        return JsonResponse({"detail": detail}, status=400)

    try:
        profile = user.safe_profile
    except DemoAccountProfile.DoesNotExist:
        profile = None

    if profile:
        if profile.verification_status not in {"demo_unverified", "demo_verified"}:
            return JsonResponse({"detail": "This account is not enabled for the demo."}, status=403)
        payload = _profile_payload(user)
    else:
        responder = ResponderAccount.objects.select_related("user").filter(user=user).first()
        if user.is_staff or AdminAccount.objects.filter(user=user).exists():
            return JsonResponse({"detail": "Admin accounts must sign in through the admin web console."}, status=403)
        if not responder:
            return JsonResponse({"detail": "This account is not configured for SAFE."}, status=403)
        payload = _responder_payload(responder)

    login(request, user)
    return JsonResponse({"user": payload})


@require_GET
def current_user(request):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Sign in required."}, status=401)
    payload = _authenticated_user_payload(request.user)
    if payload:
        return JsonResponse({"user": payload})
    else:
        return JsonResponse({"detail": "No SAFE user profile is active in this session."}, status=401)


@csrf_protect
@require_POST
def logout_view(request):
    logout(request)
    return JsonResponse({"status": "logged_out"})


def _notify_clinic(incident, event_type, message):
    notification = IncidentNotification.objects.create(
        incident=incident,
        event_type=event_type,
        message=message[:240],
    )
    responders = ResponderAccount.objects.filter(
        user__is_active=True,
        availability_status__in=[
            ResponderAccount.Availability.AVAILABLE,
            ResponderAccount.Availability.ON_BREAK,
        ],
    )
    ResponderNotification.objects.bulk_create([
        ResponderNotification(notification=notification, responder=responder)
        for responder in responders
    ])


def _clinic_case_payload(incident, include_patient=True):
    profile = getattr(incident.created_by, "safe_profile", None) if incident.created_by else None
    try:
        note = incident.clinic_note
    except ClinicCaseNote.DoesNotExist:
        note = None

    patient = None
    if include_patient:
        patient = {
            "id": incident.created_by_id,
            "case_reference": f"P{incident.created_by_id or incident.pk:05d}",
            "name": profile.display_name if profile else (
                incident.created_by.get_username() if incident.created_by else "Unknown patient"
            ),
            "email": incident.created_by.email if incident.created_by else "",
            "phone_number": profile.phone_number if profile else "",
            "account_type": profile.account_type if profile else "unknown",
        }
    return {
        "id": incident.pk,
        "incident_id": incident.pk,
        "incident_label": incident.incident_type.incident_name,
        "incident_code": incident.incident_type.code,
        "severity": incident.incident_type.priority_level,
        "guidance": incident.incident_type.guidance,
        "building": incident.location.building,
        "floor": incident.location.room,
        "description": incident.description,
        "status": incident.status,
        "response_eta_minutes": incident.response_eta_minutes,
        "created_at": incident.created_at,
        "resolved_at": incident.resolved_at,
        "patient": patient,
        "recording_notice_accepted": incident.recording_notice_accepted,
        "audio_enabled": incident.audio_enabled,
        "video_enabled": incident.video_enabled,
        "timeline": [
            {
                "id": log.pk,
                "event_type": log.event_type,
                "remarks": log.remarks,
                "action_time": log.action_time,
                "actor": log.responder.name if log.responder else (
                    log.admin.get_username() if log.admin else "SAFE system"
                ),
            }
            for log in incident.logs.select_related("admin", "responder").order_by("action_time", "pk")
        ],
        "notes": ClinicCaseNoteSerializer(note).data if note else None,
    }


@api_view(["GET", "POST"])
def report_list_create(request):
    if request.method == "GET":
        reports = EmergencyReport.objects.filter(created_by=request.user).select_related("incident_type", "location")
        serializer = EmergencyReportSerializer(reports, many=True)
        return Response(serializer.data)

    serializer = EmergencyReportSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    with transaction.atomic():
        report = serializer.save(status="submitted", response_eta_minutes=5, created_by=request.user)
        IncidentLog.objects.create(
            incident=report,
            event_type="incident_reported",
            remarks="Incident submitted by user.",
        )
        _notify_clinic(
            report,
            "new_incident",
            f"New {report.incident_type.priority_level} incident: {report.incident_type.incident_name}",
        )
    return Response(EmergencyReportSerializer(report).data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
def recent_report_history(request):
    cutoff = timezone.now() - timedelta(days=7)
    reports = EmergencyReport.objects.filter(created_at__gte=cutoff).select_related(
        "incident_type", "location",
    )
    return Response(RecentIncidentHistorySerializer(reports, many=True).data)


@api_view(["GET", "PATCH"])
def report_detail(request, pk):
    try:
        report = EmergencyReport.objects.select_related("incident_type", "location").get(pk=pk, created_by=request.user)
    except EmergencyReport.DoesNotExist:
        return Response({"detail": "Report not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        serializer = EmergencyReportSerializer(report)
        return Response(serializer.data)

    serializer = EmergencyReportSerializer(report, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    serializer.save()
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([AllowAny])
def incident_type_list(request):
    types = IncidentType.objects.all()
    return Response(IncidentTypeSerializer(types, many=True).data)


@api_view(["GET", "POST"])
@permission_classes([IsAdminAccount])
def admin_incident_type_list(request):
    if request.method == "GET":
        types = IncidentType.objects.all()
        return Response(IncidentTypeSerializer(types, many=True).data)

    serializer = IncidentTypeSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    incident_type = serializer.save()
    return Response(IncidentTypeSerializer(incident_type).data, status=status.HTTP_201_CREATED)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAdminAccount])
def admin_incident_type_detail(request, pk):
    try:
        incident_type = IncidentType.objects.get(pk=pk)
    except IncidentType.DoesNotExist:
        return Response({"detail": "Incident type not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "DELETE":
        try:
            incident_type.delete()
        except ProtectedError:
            return Response(
                {"detail": "This incident type is used by incident records and cannot be deleted."},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = IncidentTypeSerializer(incident_type, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response(serializer.data)


@api_view(["GET", "POST"])
@permission_classes([IsAdminAccount])
def admin_location_list(request):
    if request.method == "GET":
        locations = Location.objects.all()
        return Response(LocationSerializer(locations, many=True).data)

    serializer = LocationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    try:
        with transaction.atomic():
            location = serializer.save()
    except IntegrityError:
        return Response(
            {"detail": "A location with this building and room already exists."},
            status=status.HTTP_409_CONFLICT,
        )
    return Response(LocationSerializer(location).data, status=status.HTTP_201_CREATED)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAdminAccount])
def admin_location_detail(request, pk):
    try:
        location = Location.objects.get(pk=pk)
    except Location.DoesNotExist:
        return Response({"detail": "Location not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "DELETE":
        try:
            location.delete()
        except ProtectedError:
            return Response(
                {"detail": "This location is referenced by incident records and cannot be deleted."},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = LocationSerializer(location, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    try:
        with transaction.atomic():
            serializer.save()
    except IntegrityError:
        return Response(
            {"detail": "A location with this building and room already exists."},
            status=status.HTTP_409_CONFLICT,
        )
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAdminAccount])
def admin_incident_logs(request):
    logs = IncidentLog.objects.select_related("incident__incident_type", "admin")[:200]
    return Response(IncidentLogSerializer(logs, many=True).data)


@csrf_protect
@require_POST
def admin_login(request):
    data = _request_json(request)
    if not isinstance(data, dict):
        return JsonResponse({"detail": "Send a valid JSON request."}, status=400)

    username = data.get("username", "")
    password = data.get("password", "")
    if not isinstance(username, str) or not username.strip() or not isinstance(password, str) or not password:
        return JsonResponse({"detail": "Enter your administrator username and password."}, status=400)

    user = authenticate(request, username=username.strip(), password=password)
    if (
        user is None
        or not user.is_active
        or not user.is_staff
        or not AdminAccount.objects.filter(user=user).exists()
    ):
        return JsonResponse({"detail": "Administrator username or password is incorrect."}, status=403)

    login(request, user)
    return JsonResponse({"id": user.pk, "username": user.get_username()})


@api_view(["GET"])
@permission_classes([IsAdminAccount])
def admin_session(request):
    return Response({"id": request.user.pk, "username": request.user.get_username()})


@api_view(["POST"])
@permission_classes([IsAdminAccount])
def admin_logout(request):
    logout(request)
    return Response({"status": "logged_out"})


def _admin_report_payload(report):
    payload = EmergencyReportSerializer(report).data
    profile = getattr(report.created_by, "safe_profile", None) if report.created_by else None
    payload["reporter"] = {
        "name": profile.display_name if profile else (report.created_by.get_username() if report.created_by else "Unknown"),
        "email": report.created_by.email if report.created_by else "",
    }
    return payload


@api_view(["GET"])
@permission_classes([IsAdminAccount])
def admin_overview(request):
    reports = EmergencyReport.objects.all()
    users = DemoAccountProfile.objects.all()
    open_statuses = ["submitted", "acknowledged", "in_progress"]
    return Response({
        "reports_total": reports.count(),
        "reports_open": reports.filter(status__in=open_statuses).count(),
        "reports_urgent": reports.filter(incident_type__priority_level="urgent", status__in=open_statuses).count(),
        "reports_resolved": reports.filter(status__in=["resolved", "closed"]).count(),
        "users_total": users.count(),
        "users_unverified": users.filter(verification_status="demo_unverified").count(),
        "latest_reports": [
            _admin_report_payload(report)
            for report in reports.select_related(
                "incident_type", "location", "created_by", "created_by__safe_profile",
            )[:6]
        ],
    })


@api_view(["GET"])
@permission_classes([IsAdminAccount])
def admin_report_list(request):
    reports = EmergencyReport.objects.select_related(
        "incident_type", "location", "created_by", "created_by__safe_profile",
    )
    status_filter = request.query_params.get("status")
    severity_filter = request.query_params.get("severity")
    search = request.query_params.get("q", "").strip()
    if status_filter:
        reports = reports.filter(status=status_filter)
    if severity_filter:
        reports = reports.filter(incident_type__priority_level=severity_filter)
    if search:
        reports = reports.filter(
            models.Q(incident_type__incident_name__icontains=search)
            | models.Q(incident_type__code__icontains=search)
            | models.Q(location__building__icontains=search)
            | models.Q(location__room__icontains=search)
            | models.Q(description__icontains=search)
            | models.Q(created_by__email__icontains=search)
        )
    return Response([_admin_report_payload(report) for report in reports])


@api_view(["PATCH"])
@permission_classes([IsAdminAccount])
@transaction.atomic
def admin_report_update(request, pk):
    try:
        report = EmergencyReport.objects.get(pk=pk)
    except EmergencyReport.DoesNotExist:
        return Response({"detail": "Report not found."}, status=status.HTTP_404_NOT_FOUND)

    if not isinstance(request.data, dict) or not request.data or set(request.data) - {
        "status", "response_eta_minutes",
    }:
        return Response({"detail": "Provide only a status or response ETA to update."}, status=status.HTTP_400_BAD_REQUEST)

    updates = {}
    if "status" in request.data:
        allowed_statuses = {"submitted", "acknowledged", "in_progress", "resolved", "closed"}
        report_status = request.data["status"]
        if not isinstance(report_status, str) or report_status not in allowed_statuses:
            return Response({"detail": "Choose a valid report status."}, status=status.HTTP_400_BAD_REQUEST)
        updates["status"] = report_status
    if "response_eta_minutes" in request.data:
        eta = request.data["response_eta_minutes"]
        if isinstance(eta, bool) or not isinstance(eta, int) or eta < 0 or eta > 1440:
            return Response({"detail": "Response ETA must be a whole number from 0 to 1440."}, status=status.HTTP_400_BAD_REQUEST)
        updates["response_eta_minutes"] = eta
    if not updates:
        return Response({"detail": "Provide a status or response ETA to update."}, status=status.HTTP_400_BAD_REQUEST)

    original_status = report.status
    original_eta = report.response_eta_minutes
    for field, value in updates.items():
        setattr(report, field, value)
    if "status" in updates:
        if report.status in {"resolved", "closed"}:
            report.resolved_at = report.resolved_at or timezone.now()
        else:
            report.resolved_at = None
        updates["resolved_at"] = report.resolved_at
    report.save(update_fields=[*updates, "updated_at"])
    if report.status != original_status:
        IncidentLog.objects.create(
            incident=report,
            admin=request.user,
            event_type="status_changed",
            remarks=f"Status changed from {original_status} to {report.status}.",
        )
    if report.response_eta_minutes != original_eta:
        IncidentLog.objects.create(
            incident=report,
            admin=request.user,
            event_type="response_eta_updated",
            remarks=f"Response ETA changed from {original_eta} to {report.response_eta_minutes} minutes.",
        )
    report = EmergencyReport.objects.select_related(
        "incident_type", "location", "created_by", "created_by__safe_profile",
    ).get(pk=report.pk)
    return Response(_admin_report_payload(report))


@api_view(["GET"])
@permission_classes([IsAdminAccount])
def admin_user_list(request):
    users = DemoAccountProfile.objects.select_related("user").order_by("-created_at")
    search = request.query_params.get("q", "").strip()
    if search:
        users = users.filter(
            models.Q(display_name__icontains=search)
            | models.Q(user__email__icontains=search)
        )
    return Response([
        {
            "id": profile.user_id,
            "display_name": profile.display_name,
            "name": profile.display_name,
            "student_id": profile.student_id,
            "course": profile.course,
            "phone_number": profile.phone_number,
            "username": profile.username or profile.user.get_username(),
            "email": profile.user.email,
            "account_type": profile.account_type,
            "user_type": profile.account_type,
            "verification_status": profile.verification_status,
            "is_active": profile.user.is_active,
            "created_at": profile.created_at,
            "reports_count": profile.user.emergency_reports.count(),
        }
        for profile in users
    ])


@api_view(["PATCH"])
@permission_classes([IsAdminAccount])
@transaction.atomic
def admin_user_update(request, pk):
    try:
        profile = DemoAccountProfile.objects.select_related("user").get(user_id=pk)
    except DemoAccountProfile.DoesNotExist:
        return Response({"detail": "Account not found."}, status=status.HTTP_404_NOT_FOUND)

    if not isinstance(request.data, dict) or not request.data or set(request.data) - {
        "verification_status", "is_active",
    }:
        return Response({"detail": "Provide only a verification status or account access state."}, status=status.HTTP_400_BAD_REQUEST)

    verification_status = request.data.get("verification_status")
    if "verification_status" in request.data:
        if not isinstance(verification_status, str) or verification_status not in {
            "demo_unverified", "demo_verified", "suspended",
        }:
            return Response({"detail": "Choose a valid verification status."}, status=status.HTTP_400_BAD_REQUEST)

    is_active = request.data.get("is_active")
    if "is_active" in request.data:
        if not isinstance(is_active, bool):
            return Response({"detail": "Account active state must be true or false."}, status=status.HTTP_400_BAD_REQUEST)

    if "verification_status" in request.data:
        profile.verification_status = verification_status
        profile.save(update_fields=["verification_status"])
    if "is_active" in request.data:
        profile.user.is_active = is_active
        profile.user.save(update_fields=["is_active"])

    return Response({
        "id": profile.user_id,
        "display_name": profile.display_name,
        "name": profile.display_name,
        "email": profile.user.email,
        "account_type": profile.account_type,
        "verification_status": profile.verification_status,
        "is_active": profile.user.is_active,
        "created_at": profile.created_at,
        "reports_count": profile.user.emergency_reports.count(),
    })


@api_view(["POST"])
@permission_classes([IsAdminAccount])
def admin_create_staff(request):
    if not isinstance(request.data, dict):
        return Response({"detail": "Send a valid JSON request."}, status=status.HTTP_400_BAD_REQUEST)

    username = request.data.get("username")
    name = request.data.get("name")
    student_id = request.data.get("student_id")
    course = request.data.get("course")
    phone_number = request.data.get("phone_number")
    email = request.data.get("email")
    password = request.data.get("password")
    if not isinstance(username, str) or not username.strip() or not isinstance(email, str):
        return Response({"detail": "Enter a username and valid email address."}, status=status.HTTP_400_BAD_REQUEST)
    required_fields = {
        "name": (name, 50),
        "student ID": (student_id, 100),
        "course": (course, 100),
        "phone number": (phone_number, 20),
    }
    for label, (value, max_length) in required_fields.items():
        if not isinstance(value, str) or not value.strip() or len(value.strip()) > max_length:
            return Response(
                {"detail": f"Enter a {label} of 1 to {max_length} characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )
    if not isinstance(password, str) or not password:
        return Response({"detail": "Enter a password."}, status=status.HTTP_400_BAD_REQUEST)

    username = username.strip()
    name = name.strip()
    student_id = student_id.strip()
    course = course.strip()
    phone_number = phone_number.strip()
    email = email.strip().lower()
    try:
        UnicodeUsernameValidator()(username)
        validate_email(email)
    except ValidationError:
        return Response({"detail": "Enter a valid username and email address."}, status=status.HTTP_400_BAD_REQUEST)
    if not isinstance(username, str) or len(username.strip()) > 150:
        return Response({"detail": "Enter a valid username of 1 to 150 characters."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        UnicodeUsernameValidator()(username)
    except ValidationError:
        return Response({"detail": "Enter a valid username."}, status=status.HTTP_400_BAD_REQUEST)
    if User.objects.filter(username__iexact=username).exists():
        return Response({"detail": "An account with this username already exists."}, status=status.HTTP_409_CONFLICT)
    if User.objects.filter(email__iexact=email).exists():
        return Response({"detail": "An account with this email already exists."}, status=status.HTTP_409_CONFLICT)

    user = User(username=username, email=email, first_name=name)
    try:
        validate_password(password, user=user)
    except ValidationError as error:
        return Response(
            {"detail": "Choose a stronger password.", "password_errors": error.messages},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        with transaction.atomic():
            user.set_password(password)
            user.is_staff = True
            user.save()
            AdminAccount.objects.update_or_create(
                user=user,
                defaults={
                    "name": name,
                    "student_id": student_id,
                    "course": course,
                    "phone_number": phone_number,
                    "username": username,
                    "user_type": "admin",
                    "created_by": request.user,
                },
            )
    except IntegrityError:
        return Response({"detail": "An account with this username or email already exists."}, status=status.HTTP_409_CONFLICT)

    return Response({
        "id": user.pk,
        "username": user.get_username(),
        "name": name,
        "student_id": student_id,
        "course": course,
        "phone_number": phone_number,
        "user_type": "admin",
        "email": user.email,
    }, status=status.HTTP_201_CREATED)


@csrf_protect
@require_POST
def clinic_login(request):
    data = _request_json(request)
    if not isinstance(data, dict):
        return JsonResponse({"detail": "Send a valid JSON request."}, status=400)
    username = data.get("username", "")
    password = data.get("password", "")
    if not isinstance(username, str) or not username.strip() or not isinstance(password, str) or not password:
        return JsonResponse({"detail": "Enter your clinic username and password."}, status=400)
    user = authenticate(request, username=username.strip(), password=password)
    if (
        user is None
        or not user.is_active
        or user.is_staff
        or AdminAccount.objects.filter(user=user).exists()
        or not ResponderAccount.objects.filter(user=user).exists()
    ):
        return JsonResponse({"detail": "Clinic staff username or password is incorrect."}, status=403)
    login(request, user)
    account = ResponderAccount.objects.select_related("user").get(user=user)
    return JsonResponse(ResponderAccountSerializer(account).data)


@api_view(["GET"])
@permission_classes([IsResponderAccount])
def clinic_session(request):
    account = ResponderAccount.objects.select_related("user").get(user=request.user)
    return Response(ResponderAccountSerializer(account).data)


@api_view(["POST"])
@permission_classes([IsResponderAccount])
def clinic_logout(request):
    logout(request)
    return Response({"status": "logged_out"})


@api_view(["PATCH"])
@permission_classes([IsResponderAccount])
def clinic_availability(request):
    value = request.data.get("availability_status") if isinstance(request.data, dict) else None
    if value not in ResponderAccount.Availability.values:
        return Response(
            {"detail": "Choose available, unavailable, or on_break."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    account = ResponderAccount.objects.get(user=request.user)
    account.availability_status = value
    account.save(update_fields=["availability_status"])
    return Response(ResponderAccountSerializer(account).data)


@api_view(["GET", "POST"])
@permission_classes([IsAdminAccount])
def admin_responder_list_create(request):
    if request.method == "GET":
        accounts = ResponderAccount.objects.select_related("user").all()
        return Response(ResponderAccountSerializer(accounts, many=True).data)

    data = request.data
    if not isinstance(data, dict):
        return Response({"detail": "Send a valid JSON request."}, status=status.HTTP_400_BAD_REQUEST)
    username = data.get("username")
    name = data.get("name")
    email = data.get("email")
    department = data.get("department")
    contact_number = data.get("contact_number")
    password = data.get("password")
    required_fields = {
        "username": (username, 150),
        "name": (name, 50),
        "department": (department, 100),
        "contact number": (contact_number, 20),
    }
    for label, (value, maximum) in required_fields.items():
        if not isinstance(value, str) or not value.strip() or len(value.strip()) > maximum:
            return Response(
                {"detail": f"Enter a {label} of 1 to {maximum} characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )
    if not isinstance(email, str) or not isinstance(password, str) or not password:
        return Response({"detail": "Enter a valid email address and password."}, status=status.HTTP_400_BAD_REQUEST)
    username = username.strip()
    email = email.strip().lower()
    name = name.strip()
    department = department.strip()
    contact_number = contact_number.strip()
    try:
        UnicodeUsernameValidator()(username)
        validate_email(email)
    except ValidationError:
        return Response({"detail": "Enter a valid username and email address."}, status=status.HTTP_400_BAD_REQUEST)
    if User.objects.filter(username__iexact=username).exists():
        return Response({"detail": "An account with this username already exists."}, status=status.HTTP_409_CONFLICT)
    if User.objects.filter(email__iexact=email).exists():
        return Response({"detail": "An account with this email already exists."}, status=status.HTTP_409_CONFLICT)
    user = User(username=username, email=email, first_name=name, is_staff=False)
    try:
        validate_password(password, user=user)
    except ValidationError as error:
        return Response(
            {"detail": "Choose a stronger password.", "password_errors": error.messages},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        with transaction.atomic():
            user.set_password(password)
            user.save()
            account = ResponderAccount.objects.create(
                user=user,
                name=name,
                department=department,
                contact_number=contact_number,
                username=username,
                created_by=request.user,
            )
    except IntegrityError:
        return Response(
            {"detail": "An account with this username or email already exists."},
            status=status.HTTP_409_CONFLICT,
        )
    return Response(ResponderAccountSerializer(account).data, status=status.HTTP_201_CREATED)


@api_view(["PATCH"])
@permission_classes([IsAdminAccount])
def admin_responder_update(request, pk):
    try:
        account = ResponderAccount.objects.select_related("user").get(pk=pk)
    except ResponderAccount.DoesNotExist:
        return Response({"detail": "Responder not found."}, status=status.HTTP_404_NOT_FOUND)
    if not isinstance(request.data, dict) or set(request.data) - {
        "name", "department", "contact_number", "availability_status", "is_active",
    }:
        return Response({"detail": "Provide valid responder fields to update."}, status=status.HTTP_400_BAD_REQUEST)
    for field, maximum in (("name", 50), ("department", 100), ("contact_number", 20)):
        if field in request.data:
            value = request.data[field]
            if not isinstance(value, str) or not value.strip() or len(value.strip()) > maximum:
                return Response(
                    {"detail": f"Enter a {field.replace('_', ' ')} of 1 to {maximum} characters."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            setattr(account, field, value.strip())
    if "availability_status" in request.data:
        value = request.data["availability_status"]
        if value not in ResponderAccount.Availability.values:
            return Response({"detail": "Choose available, unavailable, or on_break."}, status=status.HTTP_400_BAD_REQUEST)
        account.availability_status = value
    if "is_active" in request.data:
        value = request.data["is_active"]
        if not isinstance(value, bool):
            return Response({"detail": "is_active must be true or false."}, status=status.HTTP_400_BAD_REQUEST)
        account.user.is_active = value
        account.user.save(update_fields=["is_active"])
    account.save()
    return Response(ResponderAccountSerializer(account).data)


@api_view(["GET"])
@permission_classes([IsResponderAccount])
def clinic_dashboard(request):
    open_statuses = ["submitted", "acknowledged", "in_progress"]
    today = timezone.localdate()
    incidents = EmergencyReport.objects.all()
    responders = ResponderAccount.objects.filter(user__is_active=True)
    notifications = ResponderNotification.objects.filter(responder__user=request.user, status="new")
    return Response({
        "incoming_count": incidents.filter(status__in=["submitted", "acknowledged"]).count(),
        "active_count": incidents.filter(status="in_progress").count(),
        "resolved_today": incidents.filter(status__in=["resolved", "closed"], resolved_at__date=today).count(),
        "urgent_open": incidents.filter(
            status__in=open_statuses,
            incident_type__priority_level__iexact="urgent",
        ).count(),
        "responders_available": responders.filter(
            availability_status=ResponderAccount.Availability.AVAILABLE,
        ).count(),
        "responders_total": responders.count(),
        "unread_notifications": notifications.count(),
        "recent_cases": [
            _clinic_case_payload(incident)
            for incident in incidents.select_related(
                "incident_type", "location", "created_by", "created_by__safe_profile",
            )[:6]
        ],
    })


@api_view(["GET"])
@permission_classes([IsResponderAccount])
def clinic_cases(request):
    bucket = request.query_params.get("bucket", "incoming")
    statuses = {
        "incoming": ["submitted", "acknowledged"],
        "active": ["in_progress"],
        "completed": ["resolved", "closed"],
        "all": ["submitted", "acknowledged", "in_progress", "resolved", "closed"],
    }
    if bucket not in statuses:
        return Response({"detail": "Choose incoming, active, completed, or all."}, status=status.HTTP_400_BAD_REQUEST)
    incidents = EmergencyReport.objects.filter(status__in=statuses[bucket]).select_related(
        "incident_type", "location", "created_by", "created_by__safe_profile",
    )
    query = request.query_params.get("q", "").strip()
    if query:
        incidents = incidents.filter(
            models.Q(incident_type__incident_name__icontains=query)
            | models.Q(location__building__icontains=query)
            | models.Q(location__room__icontains=query)
            | models.Q(description__icontains=query)
            | models.Q(created_by__first_name__icontains=query)
        )
    incidents = incidents.order_by(
        models.Case(
            models.When(incident_type__priority_level__iexact="urgent", then=models.Value(0)),
            default=models.Value(1),
            output_field=models.IntegerField(),
        ),
        "-created_at",
    )[:200]
    return Response([_clinic_case_payload(incident) for incident in incidents])


@api_view(["GET"])
@permission_classes([IsResponderAccount])
def clinic_patients(request):
    incidents = EmergencyReport.objects.filter(created_by__isnull=False).select_related(
        "created_by", "created_by__safe_profile",
    ).order_by("-created_at")
    patients = {}
    for incident in incidents[:1000]:
        user = incident.created_by
        if user.pk not in patients:
            profile = getattr(user, "safe_profile", None)
            patients[user.pk] = {
                "id": user.pk,
                "name": profile.display_name if profile else user.get_username(),
                "email": user.email,
                "phone_number": profile.phone_number if profile else "",
                "reports_count": 0,
                "last_reported_at": incident.created_at,
            }
        patients[user.pk]["reports_count"] += 1
    query = request.query_params.get("q", "").strip().lower()
    return Response([
        patient for patient in patients.values()
        if not query or query in patient["name"].lower() or query in patient["email"].lower()
    ])


@api_view(["GET"])
@permission_classes([IsResponderAccount])
def clinic_reports(request):
    start = timezone.localdate() - timedelta(days=29)
    incidents = EmergencyReport.objects.filter(created_at__date__gte=start)
    total = incidents.count()
    urgent = incidents.filter(incident_type__priority_level__iexact="urgent").count()
    resolved = incidents.filter(status__in=["resolved", "closed"]).count()
    return Response({
        "period_start": start,
        "total": total,
        "urgent": urgent,
        "resolved": resolved,
        "resolution_rate": round(resolved * 100 / total) if total else 0,
        "by_status": [
            {"status": value, "count": incidents.filter(status=value).count()}
            for value in ["submitted", "acknowledged", "in_progress", "resolved", "closed"]
        ],
    })


@api_view(["GET"])
@permission_classes([IsResponderAccount])
def clinic_notifications(request):
    notifications = ResponderNotification.objects.filter(
        responder__user=request.user,
    ).select_related("notification__incident__incident_type").order_by("-assigned_at")[:50]
    return Response(IncidentNotificationSerializer(notifications, many=True).data)


@api_view(["POST"])
@permission_classes([IsResponderAccount])
def clinic_notification_read(request, pk):
    updated = ResponderNotification.objects.filter(
        pk=pk,
        responder__user=request.user,
        status=ResponderNotification.Status.NEW,
    ).update(status=ResponderNotification.Status.READ)
    if not updated and not ResponderNotification.objects.filter(pk=pk, responder__user=request.user).exists():
        return Response({"detail": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)
    return Response({"status": "read"})


@api_view(["GET"])
@permission_classes([IsResponderAccount])
def clinic_case_detail(request, pk):
    try:
        incident = EmergencyReport.objects.select_related(
            "incident_type", "location", "created_by", "created_by__safe_profile",
        ).get(pk=pk)
    except EmergencyReport.DoesNotExist:
        return Response({"detail": "Case not found."}, status=status.HTTP_404_NOT_FOUND)
    return Response(_clinic_case_payload(incident))


@api_view(["PUT", "PATCH"])
@permission_classes([IsResponderAccount])
@transaction.atomic
def clinic_case_notes(request, pk):
    try:
        incident = EmergencyReport.objects.get(pk=pk)
    except EmergencyReport.DoesNotExist:
        return Response({"detail": "Case not found."}, status=status.HTTP_404_NOT_FOUND)
    try:
        account = ResponderAccount.objects.get(user=request.user)
    except ResponderAccount.DoesNotExist:
        return Response({"detail": "Clinic responder account not found."}, status=status.HTTP_403_FORBIDDEN)
    note, _ = ClinicCaseNote.objects.get_or_create(incident=incident, defaults={"responder": account})
    serializer = ClinicCaseNoteSerializer(note, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save(responder=account)
    IncidentLog.objects.create(
        incident=incident,
        responder=account,
        event_type="clinical_notes_updated",
        remarks="Clinical notes updated.",
    )
    return Response(serializer.data)


@api_view(["GET", "POST"])
@permission_classes([IsResponderAccount])
def clinic_case_messages(request, pk):
    try:
        incident = EmergencyReport.objects.get(pk=pk)
    except EmergencyReport.DoesNotExist:
        return Response({"detail": "Case not found."}, status=status.HTTP_404_NOT_FOUND)
    if request.method == "GET":
        messages = incident.messages.select_related("sender").all()[:200]
        return Response(CaseMessageSerializer(messages, many=True).data)
    message = request.data.get("message") if isinstance(request.data, dict) else None
    if not isinstance(message, str) or not message.strip() or len(message.strip()) > 3000:
        return Response({"detail": "Messages must be 1 to 3000 characters."}, status=status.HTTP_400_BAD_REQUEST)
    saved = CaseMessage.objects.create(incident=incident, sender=request.user, message=message.strip())
    _notify_clinic(incident, "patient_message", f"New patient message on case #{incident.pk}.")
    return Response(CaseMessageSerializer(saved).data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsResponderAccount])
@transaction.atomic
def clinic_case_action(request, pk):
    try:
        incident = EmergencyReport.objects.select_related("incident_type").get(pk=pk)
        responder = ResponderAccount.objects.get(user=request.user)
    except EmergencyReport.DoesNotExist:
        return Response({"detail": "Case not found."}, status=status.HTTP_404_NOT_FOUND)
    except ResponderAccount.DoesNotExist:
        return Response({"detail": "Clinic responder account not found."}, status=status.HTTP_403_FORBIDDEN)
    action = request.data.get("action") if isinstance(request.data, dict) else None
    if action not in {"accept", "start_response", "resolve", "request_ambulance", "request_more_info"}:
        return Response({"detail": "Choose a supported case action."}, status=status.HTTP_400_BAD_REQUEST)
    original_status = incident.status
    message = request.data.get("message", "") if isinstance(request.data, dict) else ""
    if action == "accept":
        if incident.status not in {"submitted", "acknowledged"}:
            return Response({"detail": "Only incoming cases can be acknowledged."}, status=status.HTTP_409_CONFLICT)
        incident.status = "acknowledged"
        event_type, remarks = "case_accepted", f"Case acknowledged by {responder.name}."
    elif action == "start_response":
        if incident.status not in {"submitted", "acknowledged", "in_progress"}:
            return Response({"detail": "A completed case cannot be started."}, status=status.HTTP_409_CONFLICT)
        incident.status = "in_progress"
        event_type, remarks = "response_started", f"Response started by {responder.name}."
    elif action == "resolve":
        if incident.status in {"resolved", "closed"}:
            return Response({"detail": "This case is already complete."}, status=status.HTTP_409_CONFLICT)
        incident.status = "resolved"
        incident.resolved_at = timezone.now()
        event_type, remarks = "case_resolved", f"Case resolved by {responder.name}."
    elif action == "request_ambulance":
        event_type, remarks = "ambulance_requested", f"Ambulance request recorded by {responder.name}; this does not contact emergency services."
    else:
        if not isinstance(message, str) or not message.strip() or len(message.strip()) > 3000:
            return Response({"detail": "Enter a message of 1 to 3000 characters for the patient."}, status=status.HTTP_400_BAD_REQUEST)
        CaseMessage.objects.create(incident=incident, sender=request.user, message=message.strip())
        event_type, remarks = "patient_information_requested", f"Additional information requested by {responder.name}."
    if incident.status != original_status or action == "resolve":
        incident.save(update_fields=["status", "resolved_at", "updated_at"])
    IncidentLog.objects.create(
        incident=incident,
        responder=responder,
        event_type=event_type,
        remarks=remarks,
    )
    if action == "request_ambulance":
        _notify_clinic(incident, event_type, f"Ambulance request recorded for case #{incident.pk}. Contact emergency services directly.")
    elif action in {"accept", "start_response", "resolve"}:
        _notify_clinic(incident, event_type, f"Case #{incident.pk} is now {incident.status.replace('_', ' ')}.")
    return Response({"case": _clinic_case_payload(incident), "action": action})


@api_view(["GET", "POST"])
def patient_case_messages(request, pk):
    if not request.user.is_authenticated or not request.user.is_active:
        return Response({"detail": "Sign in to access case messages."}, status=status.HTTP_403_FORBIDDEN)
    try:
        incident = EmergencyReport.objects.get(pk=pk, created_by=request.user)
    except EmergencyReport.DoesNotExist:
        return Response({"detail": "Case not found."}, status=status.HTTP_404_NOT_FOUND)
    if request.method == "GET":
        messages = incident.messages.select_related("sender").all()[:200]
        return Response(CaseMessageSerializer(messages, many=True).data)
    message = request.data.get("message") if isinstance(request.data, dict) else None
    if not isinstance(message, str) or not message.strip() or len(message.strip()) > 3000:
        return Response({"detail": "Messages must be 1 to 3000 characters."}, status=status.HTTP_400_BAD_REQUEST)
    saved = CaseMessage.objects.create(incident=incident, sender=request.user, message=message.strip())
    _notify_clinic(incident, "patient_message", f"New patient message on case #{incident.pk}.")
    return Response(CaseMessageSerializer(saved).data, status=status.HTTP_201_CREATED)
