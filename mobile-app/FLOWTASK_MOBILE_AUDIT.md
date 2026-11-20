# FlowTask Mobile Completion Audit

## Reference parity
- Login: email/password, forgot password, Google OAuth entry point
- Dashboard: due/completed/overdue metrics, today's tasks, calendar preview, past-due tasks, search/notification actions
- Board: Work, Personal, Health, Study spaces
- Meetings: past meetings, new meeting flow, transcript paste, PDF/TXT upload, AI extraction, task creation, save/share/copy
- Settings/Profile: preferences, theme, biometric option, reminders, account info, logout
- Jerry: voice recognition, text fallback, task creation from natural language, spoken replies, basic task-status questions

## Important setup
The Jerry voice assistant uses `expo-speech-recognition` and therefore requires a native/development build rather than relying on a plain Expo Go runtime. The config plugin and Android/iOS permissions are included in `app.json`. English (`en-IN`) and Hindi/Hinglish (`hi-IN`) voice recognition are available.

After installing dependencies, use a development/preview EAS build to test Jerry on a physical device.

## Environment
Keep the existing local `mobile-app/.env` from your machine. The distributed source intentionally does not include it.

Required variables are documented in `.env.example`:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_AUTH_REDIRECT_URL`
- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_ML_API_BASE_URL` (legacy override; current app proxies AI through Node API)

For Google OAuth, `flowtask://auth/callback` (or your configured redirect URI) must also be allowed in Supabase Auth settings.
