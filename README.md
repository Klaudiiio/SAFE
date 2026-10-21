# SAFE Capstone

This project is set up for local development first. You can run the app on your machine now, and deploy to Render/Vercel later when you are ready.

This project contains:

- a Vite + React emergency workflow front end in the root workspace
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

### 4) Run the backend

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
- Backend health: http://127.0.0.1:8000/api/health/

### One-command local startup

You can also run both together with:

```bash
npm run dev:all
```

This starts the Django API and the Vite frontend in separate terminals on your machine.

## Demo sign-in

The app now opens on a login screen. Demo signups work only while Django `DEBUG=True`.
Use a fictional name, email such as `student@example.test`, and a demo password.
Choose **Student** or **Visitor**; identity checks are temporarily disabled.

Because this workspace is stored in OneDrive, start Expo with the workspace helper
instead of running Expo directly inside `mobile/`:

```powershell
.\start-expo.ps1
```

The helper runs the wrapper from a local AppData folder to avoid Metro file-watcher
crashes in OneDrive. Keep the Vite and Django terminals running as well.

Sign-up is disabled when `DEBUG=False`. Accounts are not verified as USTP students or
valid ID holders. Do not use real personal or medical information in this demo.

## For later deployment

When you are ready for Render + Vercel:

- Backend deploy to Render or Railway
- Frontend deploy to Vercel or Netlify
- Database stays on Supabase
- Set `VITE_API_URL` for the frontend and `DATABASE_URL` for the backend

The app is already structured for that later step without changing the current local-first setup.
