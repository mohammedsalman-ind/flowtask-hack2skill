# FlowTask

FlowTask is a task management application with a web client, Android/iOS mobile app, Node API, and Python AI service. The clients use the Node API for application requests, and the Node API persists application data in Supabase. The mobile app also uses Supabase client configuration for OAuth and password-reset flows. AI requests use the Python ML API, directly from the web voice task flow or through the Node API from mobile.

The web welcome screen includes a short walkthrough before registration. In the mobile app, open **More → Set up your flow** to set your planning style, favorite spaces, and reminder preferences.

## Architecture

| Component | Location | Technology |
| --- | --- | --- |
| Web client | `frontend/` | React 19, Vite, TypeScript, React Native Web |
| Mobile client | `mobile-app/` | Expo SDK 54, React Native, TypeScript |
| Application API | `backend/node-api/` | Node.js, Express, TypeScript |
| AI service | `backend/ml-api/` | Python 3.11, FastAPI, Gemini |
| Database | Supabase | PostgreSQL; SQL setup in `database/` |
| Shared types | `shared/` | TypeScript types used by the web client |

## Requirements

- Node.js 20 or newer and npm 10 or newer
- Python 3.11 for the ML API
- A Supabase project
- A Gemini API key for AI features
- Android Studio/Android SDK for a local Android development build

## Install

From the repository root, install the web and Node API workspaces:

```bash
npm ci
```

Install the mobile app separately because it has its own package and lock files:

```bash
cd mobile-app
npm ci
```

Create a Python virtual environment and install the ML service dependencies:

```bash
cd backend/ml-api
python -m venv .venv
```

Activate `.venv`, then run:

```bash
python -m pip install -r requirements.txt
```

## Environment configuration

Copy the applicable `.env.example` to `.env` and set values locally. Keep `.env` files out of Git. Variable names below are documented without values.

| File | Variable names |
| --- | --- |
| `backend/node-api/.env` | `PORT`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`, `ML_API_URL`, `FRONTEND_URL`, `AUTH_EMAIL_REDIRECT_TO`, `AUTH_AUTO_CONFIRM_EMAIL`, `EMAIL_PROVIDER`, `EMAIL_FROM`, `RESEND_API_KEY`, `SENDGRID_API_KEY` |
| `backend/ml-api/.env` | `GEMINI_API_KEY`, `PORT`, `GEMINI_MODEL` |
| `frontend/.env` | `VITE_NODE_API_URL`, `VITE_ML_API_URL` |
| `mobile-app/.env` | `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_AUTH_REDIRECT_URL` |

The Node API's `SUPABASE_SERVICE_KEY` is server-only. Set `SUPABASE_ANON_KEY` for user-scoped Supabase clients and row-level security. The browser and mobile `*_ANON_KEY` values are public client configuration; never put a service-role key in a client environment file. Email delivery is disabled by default with `EMAIL_PROVIDER=none`; select `resend` or `sendgrid` and configure its corresponding key locally to enable it. `EMAIL_FROM` may be left unset to use the code default.

The web voice task parser calls the ML API directly, so set `VITE_ML_API_URL` when it is not reachable at its local default. Other web API requests use `VITE_NODE_API_URL`. The Node API uses `ML_API_URL` to reach the ML service. Mobile AI requests go through the Node API; `EXPO_PUBLIC_ML_API_BASE_URL` remains in the mobile template but is not read by the current mobile source.

Some example files retain older integration settings that current source does not read: the frontend template's `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_GOOGLE_CLIENT_ID`; the Node API template's `REDIS_URL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`; and the mobile template's `EXPO_PUBLIC_ML_API_BASE_URL`. They remain documented in the templates pending review of whether those integrations are still intended. The Node API currently does not connect to Redis.

## Database setup

Database setup is not yet represented by one unambiguous migration chain. `database/migration.sql` provides the initial users, goals, tasks, habits, meetings, and notifications schema; `database/patch_meeting_columns.sql` repeats some meeting/task column additions. `backend/node-api/migrations/003` through `011` add assignments, recurring-task fields, and RLS changes, and some later files repeat earlier additions. Confirm the intended starting schema and migration order against the target database before applying SQL. Do not run both sets as a batch or treat this README as an approved production migration sequence.

## Run locally

From the repository root, start the web client, Node API, and Python ML API together:

```bash
npm run dev
```

The web app opens at `http://localhost:5173`. The Node API listens on port 4000 and the ML API on port 8000. The web client uses the Node API for login, registration, tasks, meetings, and Jerry. Jerry and meeting transcript analysis require the ML API and its configured provider credentials. Set up the local environment files described above before using authenticated features. These commands do not apply database migrations; the Supabase schema must already be initialized.

Or run them separately:

```bash
npm run dev:frontend  # Vite web client
npm run dev:api       # Node API
npm run dev:ml         # Python ML API
```

To run only the web UI (without backend integrations), use `npm run dev:frontend`; authentication and API-backed screens need the Node API and configured Supabase connection.

The default local ports are 5173 (web), 4000 (Node API), and 8000 (ML API). The frontend can be configured with `VITE_NODE_API_URL` and `VITE_ML_API_URL`.

## Organization Workspace

Open **Organization workspaces** from the personal app. Create an organization, invite members, and open the workspace from the picker. On Expo, go to **More → Organization workspaces**. An email invitation link opens the web sign-in flow. The signed-in account must have a verified email matching the invitation.

The workspace reuses FlowTask's Supabase Auth, `tasks`, and `notifications` tables, authenticated Node API client, and Gemini service. Organization meetings use their own visibility rules and storage, so the existing personal meeting assistant keeps its current workflow. Assignments are written to the existing task table under the assignee's account and appear in Today and Calendar. Workspace stage changes update the same records.

### Setup

1. Apply [migration 012](backend/node-api/migrations/012_organization_workspace.sql) to your configured Supabase database after its base schema and migration 011. Apply it before starting this version of the API.
2. Set `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, and `SUPABASE_ANON_KEY` in `backend/node-api/.env`. Organization routes use the signed-in user's JWT and require the anon key for RLS. Set `FRONTEND_URL` to the origin for invitation links and `ML_API_URL` if the Python API is on a different host.
3. Set the same long, random `ORG_AI_SHARED_SECRET` in both server `.env` files. Set `GEMINI_API_KEY` in `backend/ml-api/.env`. Keep these values on the servers. Workspace AI calls send the meeting transcript or a limited set of authorized workspace records to Gemini.
4. To send invitations by email, configure `EMAIL_PROVIDER` with `resend` or `sendgrid`, its API key, and `EMAIL_FROM`. Copyable links and the verified account's invitation inbox work with email delivery disabled.
5. Start with `npm run dev`. For Expo, configure the existing mobile API and Supabase settings and start the development build.

### Meeting and assignment workflow

Managers and admins can create meetings and set project, agenda, status, participants, and visibility on the web. Save pasted notes or upload a text transcript. Supported audio is sent to the existing transcription service and only its returned text is saved. Run Jerry, then expand each draft to review the quoted evidence, edit the assignment, and approve it. Unknown assignees and unclear deadlines stay open for review. After the first approval, the source and analysis are locked to keep task references stable and prevent duplicate assignments on retried approval.

Organization alerts appear in the existing in-app notifications. Deadline and upcoming-meeting alerts are generated when notifications are fetched. Workspace-specific background push delivery and a retained audio archive are outside the current implementation. Expo supports workspace switching, invitations, meeting creation with pasted notes, analysis, editable approval, task status, and Jerry questions. Use the web workspace for file uploads, project and role management, follow-ups, Kanban, and insights.

### Verification

```bash
npm run typecheck
npm run lint:frontend
npm run lint:api
npm run build:frontend
npm run build:api
node --test backend/node-api/tests/workspaceAnalysis.test.mjs
cd backend/ml-api
python -m pytest tests/test_workspace_ai.py -q
```

Run `npx tsc --noEmit` from `mobile-app` for the Expo typecheck. [The SQL regression test](backend/node-api/tests/workspace.sql) runs against a disposable PostgreSQL database with the FlowTask schema, Supabase Auth roles, and migration 012. It checks role isolation, invitation acceptance, meeting visibility, repeat approval, notification deduplication, and planner synchronization.

## Android development

The mobile app uses the Node API as its application API. For local development with a USB-connected Android phone:

1. Start the Node API and ML API from the repository root.
2. Connect the phone with USB debugging enabled and run `adb devices`.
3. Forward the Node API port: `adb reverse tcp:4000 tcp:4000`.
4. From `mobile-app/`, run `npx expo run:android`.

The native development build is required for `expo-speech-recognition`; Expo Go does not provide that native module. The mobile app defaults to `http://127.0.0.1:4000` for a native Android development build. Set `EXPO_PUBLIC_API_BASE_URL` for LAN or hosted environments. Google OAuth and password reset require `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and `EXPO_PUBLIC_AUTH_REDIRECT_URL`; allow the configured redirect URI in Supabase Auth settings.

## Verification checklist

Run non-mutating checks from the repository root:

```bash
npm run lint:frontend
npm run lint:api
npm run typecheck
```

The root typecheck covers `shared/`, the frontend, and Node API. Check mobile TypeScript separately from `mobile-app/` with `npx tsc --noEmit`; Python tests are under `backend/ml-api/tests` and can be run with `python -m pytest backend/ml-api/tests -q` after installing the ML API requirements. Avoid production builds when the corresponding `dist/` directory contains files you need to preserve.

- Register and sign in.
- Create, edit, complete, duplicate, archive, and delete a task.
- Try Jerry task creation and task status questions.
- Process a meeting transcript and convert action items into tasks.
- Restart the app and confirm that the session and tasks persist.

## Docker status

`docker-compose.yml` currently references `frontend/Dockerfile.dev` and `backend/ml-api/Dockerfile`, which are absent. Docker Compose builds are therefore not ready to use; see the repository cleanup review before changing the build contexts or deployment behavior.

## License

MIT
