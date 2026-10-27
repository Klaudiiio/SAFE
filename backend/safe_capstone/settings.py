import ipaddress
import os
import socket
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-for-safe-capstone")
DEBUG = os.environ.get("DEBUG", "True").lower() in {"1", "true", "yes", "on"}

# Allow connections from localhost, 127.0.0.1, 0.0.0.0, and wildcard in development
ALLOWED_HOSTS = [
    host.strip()
    for host in os.environ.get("ALLOWED_HOSTS", "localhost,127.0.0.1,0.0.0.0,*").split(",")
    if host.strip()
]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "reports",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",  # Must remain at the top
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "safe_capstone.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "safe_capstone.wsgi.application"

# Database Configuration
DATABASE_URL = os.environ.get("DATABASE_URL")
if DATABASE_URL:
    database_config = dj_database_url.parse(DATABASE_URL, conn_max_age=600)
    is_supabase_pooler = (database_config.get("HOST") or "").endswith(".pooler.supabase.com")
    pooler_port = str(database_config.get("PORT") or "")
    if is_supabase_pooler and pooler_port in {"5432", "6543"}:
        if pooler_port == "5432":
            database_config["PORT"] = "6543"
        database_config["CONN_MAX_AGE"] = 0
        database_config["DISABLE_SERVER_SIDE_CURSORS"] = True
    DATABASES = {
        "default": database_config,
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework.authentication.SessionAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
}

# --- CORS & CSRF SETTINGS FOR MOBILE & EXPO GO ---

CORS_ALLOW_CREDENTIALS = True

# When running locally in DEBUG mode, allow all origins so Expo Go can connect without origin headers
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOWED_ORIGINS = [
        origin.strip()
        for origin in os.environ.get(
            "CORS_ALLOWED_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8081,http://127.0.0.1:8081",
        ).split(",")
        if origin.strip()
    ]

# Allowed headers for React Native requests
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]

# Base Trusted Origins
CSRF_TRUSTED_ORIGINS = [
    origin.strip() for origin in os.environ.get("CSRF_TRUSTED_ORIGINS", "").split(",") if origin.strip()
]

# Dynamic Local IP Detection for Wi-Fi / Local Area Network
if DEBUG:
    local_dev_ports = (5173, 5174, 8081, 8082, 8083, 8085, 19000, 19006, 8000)
    local_dev_origins = [
        f"http://{host}:{port}"
        for host in ("localhost", "127.0.0.1")
        for port in local_dev_ports
    ]
    CSRF_TRUSTED_ORIGINS.extend(
        origin for origin in local_dev_origins if origin not in CSRF_TRUSTED_ORIGINS
    )

    local_ipv4_addresses = set()
    try:
        for address_info in socket.getaddrinfo(
            socket.gethostname(), None, socket.AF_INET, socket.SOCK_STREAM
        ):
            address = ipaddress.ip_address(address_info[4][0])
            if address.is_private and not address.is_loopback and not address.is_link_local:
                local_ipv4_addresses.add(str(address))
    except Exception:
        pass

    for address in sorted(local_ipv4_addresses):
        if address not in ALLOWED_HOSTS:
            ALLOWED_HOSTS.append(address)

    LOCAL_NETWORK_CSRF_ORIGINS = [
        f"http://{address}:{port}"
        for address in sorted(local_ipv4_addresses)
        for port in local_dev_ports
    ]
    CSRF_TRUSTED_ORIGINS.extend(LOCAL_NETWORK_CSRF_ORIGINS)

# Session and Cookie Security
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = not DEBUG

CSRF_COOKIE_HTTPONLY = False  # Allows React Native fetch to read CSRF token if needed
CSRF_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SECURE = not DEBUG