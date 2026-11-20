# FlowTask Mobile App ⚡

FlowTask is an AI-powered mobile task manager with task spaces, calendar views, Jerry voice/text commands, and an AI Meeting Assistant.

## Local Android development

### 1. Start the backend

From the repository root:

```powershell
npm run dev:api
```

Start the ML API separately:

```powershell
cd backend/ml-api
python main.py
```

Set `GEMINI_API_KEY` in `backend/ml-api/.env`. The Node API forwards authenticated AI requests to the ML API.

### 2. Connect an Android phone

Enable Developer Options + USB debugging, connect the phone, and verify:

```powershell
adb devices
```

Then forward the API port over USB:

```powershell
adb reverse tcp:4000 tcp:4000
```

### 3. Build/run the mobile app

```powershell
cd mobile-app
npx expo run:android
```

The app defaults to `http://127.0.0.1:4000` for native Android development. `EXPO_PUBLIC_API_BASE_URL` can override it for LAN/staging/production.

## Environment

Copy `.env.example` to `.env` only when you need overrides or Supabase OAuth/password-reset configuration. Never commit `.env`.

Required for Google OAuth/password reset:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_AUTH_REDIRECT_URL`

Email/password login, signup, tasks, meetings, and Jerry use the Node API.

## Main features

- Email/password authentication with validation and persistent sessions
- Password visibility toggle
- Forgot-password flow
- Google OAuth entry point
- Task create/edit/delete/duplicate/archive/complete
- Task priority, status, context, due date, tags, and assignee
- Assignee notifications when a matching account is found
- Dashboard, board, calendar, search, filters, and notifications
- Jerry voice assistant with English and Hindi/Hinglish speech recognition
- Jerry text fallback and natural-language task creation
- AI meeting summarization, key points, risks, deadlines, and action items
- PDF/TXT transcript upload
- Save meeting analysis without re-running Gemini
- Convert individual/all action items into real tasks
- Theme persistence and optional biometric app lock
- Loading, empty, retry, validation, and destructive-action confirmation states
