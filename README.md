# SAFE Capstone

This project is set up for local development first. You can run the app on your machine now, and deploy to Render/Vercel later when you are ready.

This project contains:

- the combined SAFE APP in `app/`, with role-based student, visitor, and clinic staff dashboards
- the separate administrator web console in `web/`
- the Django API and database migrations in `backend/`
- a Supabase-ready Postgres configuration for later production deployment

## Local development (recommended for now)

### 1) Install Python dependencies

```bash
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2) Configure environment (optional for local development)

Local development uses the default settings. To set a custom database or secret,
copy `backend/.env.example` to `backend/.env` and edit the values.

For local-only work, the default values are usually fine until you connect Supabase. If you want to use Supabase later, set:

- `DATABASE_URL` to your Supabase Postgres URL
- `SECRET_KEY` to a secure random value
- `CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174`

When `DATABASE_URL` points to the Supabase connection pooler, Django uses the
transaction-pooler port (`6543`), disables persistent connections, and disables
server-side cursors. This avoids exhausting the smaller session-pooler client
limit during local development.

### 3) Run database migrations

```bash
cd backend
python manage.py migrate
```

### 4) Run the backend for the web app

```bash
cd backend
python manage.py runserver 127.0.0.1:8000
```

### 5) Run the app and admin web

In another terminal:

```bash
npm install
npm run dev
```

In a third terminal, start the admin web:

```bash
npm run dev:web
```

Open:

- SAFE APP: http://localhost:5173
- Admin web: http://localhost:5174
- Backend health: http://127.0.0.1:8000/api/health/

### Admin console

Create a Django staff account from the `backend/` directory:

```powershell
python manage.py createsuperuser
```

Open http://localhost:5174 and sign in with that account's username and
password. The console provides staff-only incident review and response status/ETA
updates, plus demo account verification and access controls. Admin API access is
restricted to authenticated Django staff users. After signing in,
choose **Create staff account** on the overview or **Create admin account** in
the sidebar to add another staff login. The console also manages incident types,
manual campus locations, and incident activity logs. New accounts receive staff permissions
only; only an existing administrator or staff member can create them, and the
first staff account must be bootstrapped with `createsuperuser`. Admin membership
is tracked in the `admin_accounts` database table linked to Django users;
existing staff accounts are added by migration, and new staff accounts are
recorded when created. Password hashes remain in Django's `auth_user` table.
Regular user profiles and admin accounts store a `user_id` primary key, name,
student ID, course, phone number, creation timestamp, username, and account type
(`user_type`). New regular and admin account forms require name, student ID,
course, and phone number. Passwords are hashed and managed only by Django's
`auth_user` credential table; they are never duplicated or stored as plaintext in
the profile tables. SAFE application tables use readable names: `user_accounts`
for regular profiles, `admin_accounts` for staff accounts, `incident_types` for
the admin-managed incident catalog, `locations` for manual building/room entries,
`incidents` for user reports, and `incident_logs` for submission and response
history. Each incident links to one incident type and location; location
coordinates are optional and are not collected by the user reporting forms.
The incident schema migration preserves existing report data while linking it
to the new catalog and location records. Django's built-in `auth_user` and
related authentication tables keep their framework-defined names.
The signed-in user's report history is private to that account. The app also
provides a separate view of incident summaries from the past seven days; it
omits report descriptions and reporter details.

### Role-based SAFE APP access

SAFE APP has a single sign-in and sign-up page. Student and visitor accounts
created in the app open the user dashboard; clinic responder accounts created by
an administrator in **Admin web → Clinic responders** open the clinic dashboard.
Responder accounts remain separate non-admin Django accounts, and all account
sessions and report data continue to use the backend API and migrations.

The clinic dashboard includes a shared incident queue, responder availability,
in-app alerts, patient contact and secure case messages, clinical notes, vitals,
incident history, and response summaries. An ambulance request records and
alerts the clinic team only; it does not dispatch an ambulance or contact
emergency services.

The role-based user and clinic screens, sign-up/sign-in, and app components are
implemented together in `app/src/app/App.tsx`. The app and admin web both use
the Django API in `backend/`; run `python manage.py migrate` there to apply the
existing database migrations.

Apply the backend migrations before first use:

```powershell
cd backend
python manage.py migrate
```

The demo is not a substitute for emergency services or an approved clinical
record system.

### One-command local startup

You can also run both together with:

```bash
npm run dev:all
```

This starts Django, SAFE APP, and the separate admin web in separate terminals.

## Demo sign-in

The web app opens on a login screen. Demo signups work only while Django `DEBUG=True`.
Use a fictional name, email such as `student@example.test`, and a demo password.
Choose **Student** or **Visitor**; identity checks are temporarily disabled.

Sign-up is disabled when `DEBUG=False`. Accounts are not verified as USTP students or
valid ID holders. Do not use real personal or medical information in this demo.

## For later deployment

When you are ready for Render + Vercel:

- Backend deploy to Render or Railway
- Frontend deploy to Vercel or Netlify
- Database stays on Supabase
- Set `VITE_API_URL` for the frontend and `DATABASE_URL` for the backend

The app is already structured for that later step without changing the current local-first setup.
