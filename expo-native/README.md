# SAFE Expo app

This is the native React Native app, upgraded to Expo SDK 58. It talks to the existing Django API; the Vite app and admin console remain unchanged.

> **Expo Go compatibility:** Expo's SDK 58 transition guidance currently recommends SDK 57 for physical-device Expo Go. This SDK 58 project may not open in the Expo Go app on your phone until Expo Go adds SDK 58 support. Use an SDK 58 development build in the meantime, or switch the project back to SDK 57 for Expo Go.

## Start the Expo app

From the repository root, use the root script so npm selects this project's SDK-local Expo CLI:

```powershell
npm run start:mobile
```

Alternatively, run the command from this directory:

```powershell
npx expo start
```

Do not run bare `npx expo start` from the repository root. The root package is the Vite web app and does not own the Expo SDK dependencies; that can select a globally cached legacy Expo CLI instead.

## Run on a phone with Expo Go

1. Install the **Expo Go** app on your phone.
2. Connect the phone and computer to the same Wi-Fi network.
3. Copy `.env.example` to `.env` and replace the example address with your computer's Wi-Fi IPv4 address:

   ```dotenv
   EXPO_PUBLIC_API_URL=http://192.168.1.20:8000
   ```

   Do not use `localhost` or `127.0.0.1` here; on a phone those refer to the phone itself.
4. In the repository root, start the backend so it listens on the network:

   ```powershell
   cd backend
   .\.venv\Scripts\python.exe manage.py runserver YOUR_PC_LAN_IP:8000
   ```

   If the virtual environment is not set up yet, follow the Python dependency and migration steps in the root README first.
5. In another terminal, from the repository root:

   ```powershell
   npm run start:mobile
   ```

6. When the installed Expo Go version supports SDK 58, scan the QR code shown by Expo Go. Allow the Windows Firewall prompt for private networks if it appears. Until then, open this project in an SDK 58 development build instead.

If the API address changes, update `.env` and restart Expo with `npm start -- --clear`. You can verify network access by opening `http://YOUR_PC_LAN_IP:8000/api/health/` in the phone browser.

## Implemented flows

- Student/visitor sign-in and demo sign-up
- Incident selection, report details, notice acknowledgment, submission, personal/recent history, and secure case messages
- Clinic dashboard, case queues/details, case actions, notes, patient list, timeline, messages, reports, notifications, availability, and resources

The recording preferences are sent with a report, but this demo app does not capture or upload audio or video. An ambulance request is only recorded for the clinic team; it does not contact emergency services.
