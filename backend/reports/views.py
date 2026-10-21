import json

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import IntegrityError, transaction
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import DemoAccountProfile, EmergencyReport
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
        "account_type": profile.account_type,
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
    email = data.get("email", "")
    password = data.get("password", "")
    account_type = data.get("account_type", "")

    if not isinstance(display_name, str):
        return JsonResponse({"detail": "Enter a name of 1 to 100 characters."}, status=400)
    display_name = display_name.strip()
    if not display_name or len(display_name) > 100:
        return JsonResponse({"detail": "Enter a name of 1 to 100 characters."}, status=400)
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

    user = User(username=email, email=email, first_name=display_name)
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
    user = authenticate(request, username=email, password=password)
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
