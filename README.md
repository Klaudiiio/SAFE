# SAFE Capstone

This project is set up for local development first. You can run the app on your machine now, and deploy to Render/Vercel later when you are ready.

This project contains:

- a Vite + React emergency workflow front end in the root workspace
- a separate staff-only React admin console in `admin/`
- a Django API in the `backend/` directory
- a Supabase-ready Postgres configuration for later production deployment

## Local development (recommended for now)

### 1) Install Python dependencies

```bash
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2) Create the local environment file

```bash
copy .env.example .env
```

For local-only work, the default values are usually fine until you connect Supabase. If you want to use Supabase later, set:

- `DATABASE_URL` to your Supabase Postgres URL
- `SECRET_KEY` to a secure random value
- `CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173`

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

### 5) Run the frontend

In a second terminal:

```bash
npm install
npm run dev
```

Open:

- Frontend: http://localhost:5173
- Admin console: http://localhost:5173/admin/
- Backend health: http://127.0.0.1:8000/api/health/

### Admin console

Create a Django staff account from the `backend/` directory:

```powershell
python manage.py createsuperuser
```

Open http://localhost:5173/admin/ and sign in with that account's username and
password. The console provides staff-only incident review and response status/ETA
updates, plus demo account verification and access controls. Admin API access is
restricted to authenticated Django staff users. After signing in at `/admin/`,
choose **Create staff account** on the overview or **Create admin account** in
the sidebar to add another staff login. New accounts receive staff permissions
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
for regular profiles, `admin_accounts` for staff accounts, and `emergency_reports`
for reports. A migration renames the existing tables in place without deleting
their records. Django's built-in `auth_user` and related authentication tables
keep their framework-defined names.

### One-command local startup

You can also run both together with:

```bash
npm run dev:all
```

This starts the Django API and the Vite frontend in separate terminals on your machine.

## Demo sign-in

The web app opens on a login screen. Demo signups work only while Django `DEBUG=True`.
Use a fictional name, email such as `student@example.test`, and a demo password.
Choose **Student** or **Visitor**; identity checks are temporarily disabled.

### Run the native mobile app

Expo runs the React Native app in `mobile/` directly. Vite is not required.

In one terminal, start the API so your phone can reach it over your local network:

```powershell
npm run dev:api:lan
```

In another terminal:

```powershell
cd mobile
npx expo start
```

The app automatically uses the Expo computer IP for the API address. If needed,
edit the **Django API address** field in the app to your computer's local IP with
`:8000`. Connect the phone and computer to the same network and allow Python
through Windows Firewall when prompted. You do not need `npm run dev`.

Because this workspace is stored in OneDrive, Metro file-watcher crashes may
occur when running Expo directly. If that happens, use the workspace helper:

```powershell
.\start-expo.ps1
```

The helper runs the native app from a local AppData folder to avoid Metro
file-watcher crashes in OneDrive. Keep the Django API running separately.

The facility status and response metrics in the mobile home screen are demo
values. Quick-contact buttons open the phone app, but currently use fictional
`555-01xx` numbers; replace them with verified clinic contacts before real use.

Sign-up is disabled when `DEBUG=False`. Accounts are not verified as USTP students or
valid ID holders. Do not use real personal or medical information in this demo.

## For later deployment

When you are ready for Render + Vercel:

- Backend deploy to Render or Railway
- Frontend deploy to Vercel or Netlify
- Database stays on Supabase
- Set `VITE_API_URL` for the frontend and `DATABASE_URL` for the backend

The app is already structured for that later step without changing the current local-first setup.
