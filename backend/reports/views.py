import json

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import IntegrityError, models, transaction
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import AdminAccount, DemoAccountProfile, EmergencyReport
from .permissions import IsAdminAccount
from .serializers import EmergencyReportSerializer


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

    email = data.get("email", "")
    password = data.get("password", "")
    if not isinstance(email, str):
        return JsonResponse({"detail": "Enter a valid email address."}, status=400)
    email = email.strip().lower()
    try:
        validate_email(email)
    except ValidationError:
        return JsonResponse({"detail": "Enter a valid email address."}, status=400)
    if not isinstance(password, str) or not password:
        return JsonResponse({"detail": "Enter your password."}, status=400)
    account = User.objects.filter(email__iexact=email).first()
    user = authenticate(
        request,
        username=account.get_username() if account else email,
        password=password,
    )
    if user is None or not user.is_active:
        detail = "Email or password is incorrect."
        if settings.DEBUG:
            existing_user = User.objects.filter(email__iexact=email).first()
            if existing_user is None:
                detail = "No demo account exists for this email. Choose Sign up to create one first."
            elif not existing_user.check_password(password):
                detail = "That password does not match this account. Passwords are case-sensitive; use the exact password from signup."
            elif not existing_user.is_active:
                detail = "This account is disabled. Contact the demo administrator."
        return JsonResponse({"detail": detail}, status=400)

    try:
        profile = user.safe_profile
    except DemoAccountProfile.DoesNotExist:
        return JsonResponse({"detail": "This account is not configured for SAFE."}, status=403)

    if profile.verification_status not in {"demo_unverified", "demo_verified"}:
        return JsonResponse({"detail": "This account is not enabled for the demo."}, status=403)

    login(request, user)
    return JsonResponse({"user": _profile_payload(user)})


@require_GET
def current_user(request):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Sign in required."}, status=401)
    try:
        return JsonResponse({"user": _profile_payload(request.user)})
    except DemoAccountProfile.DoesNotExist:
        logout(request)
        return JsonResponse({"detail": "This account is not configured for SAFE."}, status=403)


@csrf_protect
@require_POST
def logout_view(request):
    logout(request)
    return JsonResponse({"status": "logged_out"})


@api_view(["GET", "POST"])
def report_list_create(request):
    if request.method == "GET":
        reports = EmergencyReport.objects.filter(created_by=request.user)
        serializer = EmergencyReportSerializer(reports, many=True)
        return Response(serializer.data)

    serializer = EmergencyReportSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    report = serializer.save(status="submitted", response_eta_minutes=5, created_by=request.user)
    return Response(EmergencyReportSerializer(report).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH"])
def report_detail(request, pk):
    try:
        report = EmergencyReport.objects.get(pk=pk, created_by=request.user)
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
        "reports_urgent": reports.filter(severity=EmergencyReport.Severity.URGENT, status__in=open_statuses).count(),
        "reports_resolved": reports.filter(status__in=["resolved", "closed"]).count(),
        "users_total": users.count(),
        "users_unverified": users.filter(verification_status="demo_unverified").count(),
        "latest_reports": [
            _admin_report_payload(report)
            for report in reports.select_related("created_by", "created_by__safe_profile")[:6]
        ],
    })


@api_view(["GET"])
@permission_classes([IsAdminAccount])
def admin_report_list(request):
    reports = EmergencyReport.objects.select_related("created_by", "created_by__safe_profile")
    status_filter = request.query_params.get("status")
    severity_filter = request.query_params.get("severity")
    search = request.query_params.get("q", "").strip()
    if status_filter:
        reports = reports.filter(status=status_filter)
    if severity_filter:
        reports = reports.filter(severity=severity_filter)
    if search:
        reports = reports.filter(
            models.Q(incident_label__icontains=search)
            | models.Q(incident_id__icontains=search)
            | models.Q(building__icontains=search)
            | models.Q(description__icontains=search)
            | models.Q(created_by__email__icontains=search)
        )
    return Response([_admin_report_payload(report) for report in reports])


@api_view(["PATCH"])
@permission_classes([IsAdminAccount])
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

    for field, value in updates.items():
        setattr(report, field, value)
    report.save(update_fields=[*updates, "updated_at"])
    report = EmergencyReport.objects.select_related("created_by", "created_by__safe_profile").get(pk=report.pk)
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
