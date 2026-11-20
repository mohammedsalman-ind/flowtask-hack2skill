# FlowTask Final Setup

This package intentionally excludes `node_modules`, Expo/Gradle caches, build output, `.env` files, and other generated files. Install dependencies locally before running it.

## 1. Configure secrets

Create these local files from the included examples:

- `backend/node-api/.env` — add your Supabase URL and server-only service-role key.
- `backend/ml-api/.env` — add your Gemini API key.
- `mobile-app/.env` is optional for USB/ADB development because the mobile app defaults to `http://127.0.0.1:4000`. It is required if you use Supabase Google OAuth or password reset; copy `.env.example` and add the real Supabase public/anon key.

Never commit these files.

## 2. Database

Run `database/migration.sql` in Supabase. If the database was created from an older version, also run `database/patch_meeting_columns.sql`.

## 3. Install dependencies

From the project root:

```powershell
npm install
cd backend\ml-api
pip install -r requirements.txt
cd ..\..
cd mobile-app
npm install
```

## 4. Android USB development

With the phone authorized for USB debugging:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" reverse tcp:4000 tcp:4000
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" reverse tcp:8000 tcp:8000
```

Then run the Node API, ML API, and Android app.

```powershell
# terminal 1
cd backend\node-api
npm run dev

# terminal 2
cd backend\ml-api
python main.py

# terminal 3
cd mobile-app
npx expo run:android
```

The mobile app uses the Node API as its single application API. AI traffic is proxied by Node to the ML API, so the phone does not need direct access to Gemini.

## 5. Web

Copy `frontend/.env.example` to `frontend/.env` and set `VITE_NODE_API_URL` to the Node API URL. Start the Node API and then:

```powershell
cd frontend
npm install
npm run dev
```

## Final smoke test

1. Register/login.
2. Create, edit, complete, duplicate, archive, and delete a task.
3. Ask Jerry for a concrete task and verify it appears in Tasks.
4. Ask Jerry for today/overdue/pending counts.
5. Process a transcript and verify summary + action items.
6. Create selected/all meeting action items as tasks.
7. Restart the app and verify the session/tasks persist.
