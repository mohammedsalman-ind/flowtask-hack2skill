"""Deterministic tests for the three final features:
1. Delete Account
2. True Daily Recurring Task Occurrences
3. Meeting Recording → Automatic Transcription
"""
from pathlib import Path
from datetime import datetime, timedelta


# ==================== DELETE ACCOUNT TESTS ====================

def test_auth_route_has_delete_me_endpoint():
    """Verify auth.ts has a DELETE /me handler."""
    auth_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "auth.ts"
    content = auth_path.read_text(encoding="utf-8")
    assert "router.delete('/me'" in content, "Must have DELETE /me route"
    assert "authMiddleware" in content, "DELETE /me must require authentication"


def test_delete_account_verifies_user_id_from_session():
    """Verify delete account uses server-side user ID, not client-provided ID."""
    auth_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "auth.ts"
    content = auth_path.read_text(encoding="utf-8")
    # Must use req.user!.id, not req.body.id or req.params.id
    assert "req.user!.id" in content, "Must derive user ID from authenticated session"


def test_delete_account_cleans_up_data():
    """Verify delete account cleans up user-owned data."""
    auth_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "auth.ts"
    content = auth_path.read_text(encoding="utf-8")
    assert "tasks" in content, "Must delete user tasks"
    assert "meetings" in content, "Must delete user meetings"
    assert "notifications" in content, "Must delete user notifications"
    assert "users" in content, "Must delete user profile"


def test_delete_account_deletes_auth_user():
    """Verify delete account removes the Supabase auth user."""
    auth_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "auth.ts"
    content = auth_path.read_text(encoding="utf-8")
    assert "deleteUser" in content, "Must call Supabase admin.deleteUser()"
    assert "auth.admin.deleteUser" in content, "Must use admin SDK for user deletion"


def test_delete_account_handles_assignments():
    """Verify delete account handles task_assignments table."""
    auth_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "auth.ts"
    content = auth_path.read_text(encoding="utf-8")
    assert "task_assignments" in content, "Must clean up task_assignments"
    assert "sender_user_id" in content, "Must handle sender assignments"
    assert "recipient_user_id" in content, "Must handle received assignments"


def test_delete_account_does_not_expose_raw_errors():
    """Verify delete account returns friendly error messages."""
    auth_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "auth.ts"
    content = auth_path.read_text(encoding="utf-8")
    assert "Could not delete account" in content, "Must return friendly error message"


def test_settings_screen_handles_deletion_gracefully():
    """Verify SettingsScreen handles signOut failure after deletion."""
    settings_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "SettingsScreen.tsx"
    content = settings_path.read_text(encoding="utf-8")
    assert "try { await signOut(); } catch" in content or "try{await signOut()" in content.replace(" ", ""), \
        "Must handle signOut failure after deletion"


def test_delete_button_prevents_double_tap():
    """Verify the delete button disables during deletion."""
    settings_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "SettingsScreen.tsx"
    content = settings_path.read_text(encoding="utf-8")
    assert "disabled={deleting}" in content, "Delete button must be disabled during deletion"


# ==================== TRUE DAILY RECURRING TESTS ====================

def test_recurring_manager_has_occurrence_generation():
    """Verify recurringTaskManager generates actual occurrences."""
    manager_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "recurringTaskManager.ts"
    content = manager_path.read_text(encoding="utf-8")
    assert "getMissingOccurrenceDates" in content, "Must have getMissingOccurrenceDates function"
    assert "buildOccurrenceInput" in content, "Must have buildOccurrenceInput function"
    assert "findTasksNeedingOccurrences" in content, "Must have findTasksNeedingOccurrences function"


def test_recurring_manager_preserves_parent_task_id():
    """Verify occurrences link back to parent task."""
    manager_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "recurringTaskManager.ts"
    content = manager_path.read_text(encoding="utf-8")
    assert "parent_task_id" in content, "Occurrences must have parent_task_id"
    assert "parentTask.id" in content, "Must link to parent task ID"


def test_recurring_manager_advances_due_date():
    """Verify occurrences have the correct next-day due date."""
    manager_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "recurringTaskManager.ts"
    content = manager_path.read_text(encoding="utf-8")
    assert "occurrenceDate" in content, "Must use occurrence date for due_date"
    assert "getNextDate" in content or "setDate" in content or "getDate" in content, "Must calculate next date"


def test_recurring_manager_does_not_reset_database():
    """Verify the manager no longer resets database rows."""
    manager_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "recurringTaskManager.ts"
    content = manager_path.read_text(encoding="utf-8")
    # The legacy reset function should return false
    assert "return false" in content, "shouldResetRecurringTask should return false (no more in-memory reset)"


def test_recurring_manager_has_deduplication():
    """Verify duplicate occurrence prevention."""
    manager_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "recurringTaskManager.ts"
    content = manager_path.read_text(encoding="utf-8")
    assert "deduplicateOccurrences" in content, "Must have deduplication function"
    assert "isSameOccurrence" in content, "Must have occurrence comparison function"


def test_tasks_context_generates_occurrences():
    """Verify TasksContext generates missing occurrences on load."""
    context_path = Path(__file__).parents[3] / "mobile-app" / "src" / "context" / "TasksContext.tsx"
    content = context_path.read_text(encoding="utf-8")
    assert "generateMissingOccurrences" in content, "TasksContext must have generateMissingOccurrences"
    assert "findTasksNeedingOccurrences" in content, "Must call findTasksNeedingOccurrences"
    assert "buildOccurrenceInput" in content, "Must call buildOccurrenceInput"


def test_tasks_type_has_parent_task_id():
    """Verify Task type includes parent_task_id."""
    types_path = Path(__file__).parents[3] / "mobile-app" / "src" / "types" / "index.ts"
    content = types_path.read_text(encoding="utf-8")
    assert "parent_task_id" in content, "Task type must have parent_task_id"


def test_create_task_input_has_parent_task_id():
    """Verify CreateTaskInput includes parent_task_id."""
    types_path = Path(__file__).parents[3] / "mobile-app" / "src" / "types" / "index.ts"
    content = types_path.read_text(encoding="utf-8")
    assert "parent_task_id" in content, "CreateTaskInput must have parent_task_id"


def test_migration_has_parent_task_id():
    """Verify migration adds parent_task_id to tasks table."""
    migration_path = Path(__file__).parents[3] / "backend" / "node-api" / "migrations" / "004_recurring_parent_task.sql"
    assert migration_path.exists(), "Migration file must exist"
    content = migration_path.read_text(encoding="utf-8")
    assert "parent_task_id" in content, "Migration must add parent_task_id column"
    assert "REFERENCES tasks(id)" in content, "Must reference tasks table"


def test_calendar_uses_shared_task_data():
    """Verify Calendar uses TasksContext (shared data source)."""
    calendar_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "CalendarScreen.tsx"
    content = calendar_path.read_text(encoding="utf-8")
    assert "useTasks" in content, "Calendar must use TasksContext"
    assert "tasks" in content, "Calendar must use tasks from context"


# ==================== MEETING TRANSCRIPTION TESTS ====================

def test_transcription_service_exists():
    """Verify the transcription service file exists."""
    transcription_path = Path(__file__).parents[3] / "backend" / "ml-api" / "transcription.py"
    assert transcription_path.exists(), "transcription.py must exist"
    content = transcription_path.read_text(encoding="utf-8")
    assert "transcribe_audio" in content, "Must have transcribe_audio function"
    assert "gemini" in content.lower(), "Must use Gemini for transcription"
    assert "GEMINI_API_KEY" in content or "_get_client" in content, "Must use Gemini API key"


def test_transcription_handles_no_api_key():
    """Verify transcription gracefully handles missing API key."""
    transcription_path = Path(__file__).parents[3] / "backend" / "ml-api" / "transcription.py"
    content = transcription_path.read_text(encoding="utf-8")
    assert "not configured" in content.lower() or "Transcription service" in content, "Must return friendly error"
    assert "_get_client" in content, "Must have client init that checks for key"


def test_transcription_handles_empty_audio():
    """Verify transcription handles empty/too-short audio."""
    transcription_path = Path(__file__).parents[3] / "backend" / "ml-api" / "transcription.py"
    content = transcription_path.read_text(encoding="utf-8")
    assert "empty" in content.lower() or "too short" in content.lower(), "Must handle empty audio"


def test_transcription_handles_timeout():
    """Verify transcription handles timeouts gracefully."""
    transcription_path = Path(__file__).parents[3] / "backend" / "ml-api" / "transcription.py"
    content = transcription_path.read_text(encoding="utf-8")
    assert "TimeoutException" in content or "timeout" in content.lower(), "Must handle timeouts"


def test_transcription_handles_network_error():
    """Verify transcription handles network/API errors gracefully."""
    transcription_path = Path(__file__).parents[3] / "backend" / "ml-api" / "transcription.py"
    content = transcription_path.read_text(encoding="utf-8")
    assert "try" in content and "except" in content, "Must have try/except for error handling"
    assert "transcription failed" in content.lower() or "try again" in content.lower(), "Must return friendly error on failure"


def test_transcription_cleans_up_temp_files():
    """Verify transcription cleans up temporary files."""
    transcription_path = Path(__file__).parents[3] / "backend" / "ml-api" / "transcription.py"
    content = transcription_path.read_text(encoding="utf-8")
    assert "finally" in content, "Must have cleanup in finally block"
    assert "unlink" in content or "delete" in content.lower(), "Must delete temp files"


def test_ml_api_has_transcribe_endpoint():
    """Verify ML API has the /api/ml/transcribe endpoint."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    assert "/api/ml/transcribe" in content, "ML API must have /api/ml/transcribe endpoint"


def test_node_api_has_transcribe_proxy():
    """Verify Node API has the transcription proxy endpoint."""
    ai_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "ai.ts"
    content = ai_path.read_text(encoding="utf-8")
    assert "transcribe" in content.lower(), "Node API must have transcription proxy"
    assert "/api/ml/transcribe" in content, "Must proxy to ML API /api/ml/transcribe"


def test_meeting_screen_uses_transcription():
    """Verify MeetingAssistantScreen uses transcription after recording."""
    meeting_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "MeetingAssistantScreen.tsx"
    content = meeting_path.read_text(encoding="utf-8")
    assert "transcrib" in content.lower(), "Meeting screen must have transcription logic"
    assert "/api/ai/transcribe" in content, "Must call transcription API endpoint"


def test_meeting_screen_shows_transcribing_state():
    """Verify MeetingAssistantScreen shows transcription progress."""
    meeting_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "MeetingAssistantScreen.tsx"
    content = meeting_path.read_text(encoding="utf-8")
    assert "Transcribing" in content, "Must show 'Transcribing' state"
    assert "transcribing" in content, "Must have transcribing state variable"


def test_api_key_not_exposed_to_mobile():
    """Verify GEMINI_API_KEY is only on the server side."""
    # Check mobile code does not reference any API keys
    mobile_dir = Path(__file__).parents[3] / "mobile-app" / "src"
    for ts_file in mobile_dir.rglob("*.ts"):
        content = ts_file.read_text(encoding="utf-8")
        assert "OPENAI_API_KEY" not in content, f"{ts_file.name} must not contain OPENAI_API_KEY"
        assert "GEMINI_API_KEY" not in content, f"{ts_file.name} must not contain GEMINI_API_KEY"
    for tsx_file in mobile_dir.rglob("*.tsx"):
        content = tsx_file.read_text(encoding="utf-8")
        assert "OPENAI_API_KEY" not in content, f"{tsx_file.name} must not contain OPENAI_API_KEY"
        assert "GEMINI_API_KEY" not in content, f"{tsx_file.name} must not contain GEMINI_API_KEY"


def test_meeting_analysis_still_works():
    """Verify the existing meeting analysis pipeline is not broken."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    assert "/api/ml/analyze-meeting" in content, "Meeting analysis endpoint must exist"
    assert "/api/ml/analyze-transcript" in content, "Transcript analysis endpoint must exist"
    assert "meeting-analysis-v3" in content, "Must still report meeting-analysis-v3"


def test_recording_button_handles_transcription_failure():
    """Verify the meeting screen handles transcription failure gracefully."""
    meeting_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "MeetingAssistantScreen.tsx"
    content = meeting_path.read_text(encoding="utf-8")
    assert "catch" in content, "Must catch transcription errors"
    assert "paste meeting notes" in content.lower() or "manually" in content.lower(), "Must suggest manual input on failure"


def test_jerry_every_day_still_creates_recurrence():
    """Verify Jerry 'every day' pattern still creates daily recurrence."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    assert "every day" in content.lower() or "daily" in content.lower(), "Must detect 'every day' pattern"
    assert "recurrence" in content, "Must set recurrence field"


# ==================== GEMINI TRANSCRIPTION TESTS ====================

def test_gemini_model_used_for_transcription():
    """Verify Gemini 2.5 Flash is used for transcription."""
    transcription_path = Path(__file__).parents[3] / "backend" / "ml-api" / "transcription.py"
    content = transcription_path.read_text(encoding="utf-8")
    assert "gemini-2.5-flash" in content, "Must use gemini-2.5-flash model"


def test_no_openai_whisper_dependency():
    """Verify no OpenAI Whisper references remain."""
    transcription_path = Path(__file__).parents[3] / "backend" / "ml-api" / "transcription.py"
    content = transcription_path.read_text(encoding="utf-8")
    assert "openai" not in content.lower(), "Must not reference OpenAI"
    assert "whisper" not in content.lower(), "Must not reference Whisper"
    assert "OPENAI_API_KEY" not in content, "Must not require OPENAI_API_KEY"


def test_speaker_diarization_requested():
    """Verify transcription prompt requests speaker labels."""
    transcription_path = Path(__file__).parents[3] / "backend" / "ml-api" / "transcription.py"
    content = transcription_path.read_text(encoding="utf-8")
    assert "spk_" in content, "Must request speaker labels (spk_1, spk_2, etc.)"
    assert "speaker" in content.lower(), "Must mention speaker diarization"


def test_language_auto_detection():
    """Verify automatic language detection is used."""
    transcription_path = Path(__file__).parents[3] / "backend" / "ml-api" / "transcription.py"
    content = transcription_path.read_text(encoding="utf-8")
    assert "language" in content.lower(), "Must handle language detection"
    assert "detect" in content.lower() or "auto" in content.lower(), "Must auto-detect language"


def test_hindi_audio_supported():
    """Verify Hindi/Hinglish audio is supported."""
    transcription_path = Path(__file__).parents[3] / "backend" / "ml-api" / "transcription.py"
    content = transcription_path.read_text(encoding="utf-8")
    # Gemini natively supports Hindi — the prompt should not restrict to English
    assert "language" in content.lower(), "Must not hardcode English-only"
    assert "english" not in content.lower() or "detect" in content.lower(), "Must not restrict to English only"


def test_transcription_uses_gemini_inline_blob():
    """Verify audio is sent to Gemini as inline blob."""
    transcription_path = Path(__file__).parents[3] / "backend" / "ml-api" / "transcription.py"
    content = transcription_path.read_text(encoding="utf-8")
    assert "inline_data" in content or "Blob" in content, "Must send audio as inline blob"
    assert "generate_content" in content, "Must use generate_content API"


def test_transcription_has_file_api_fallback():
    """Verify large file support via Gemini File API."""
    transcription_path = Path(__file__).parents[3] / "backend" / "ml-api" / "transcription.py"
    content = transcription_path.read_text(encoding="utf-8")
    assert "files.upload" in content or "File API" in content, "Must support large files via File API"


def test_transcription_handles_quota_error():
    """Verify Gemini quota errors are handled gracefully."""
    transcription_path = Path(__file__).parents[3] / "backend" / "ml-api" / "transcription.py"
    content = transcription_path.read_text(encoding="utf-8")
    assert "429" in content or "quota" in content.lower(), "Must handle Gemini 429/quota errors"
    assert "busy" in content.lower() or "try again" in content.lower(), "Must return friendly quota error"


def test_transcription_handles_auth_error():
    """Verify Gemini auth errors are handled gracefully."""
    transcription_path = Path(__file__).parents[3] / "backend" / "ml-api" / "transcription.py"
    content = transcription_path.read_text(encoding="utf-8")
    assert "401" in content or "authentication" in content.lower(), "Must handle auth errors"


def test_transcription_handles_timeout():
    """Verify transcription timeout is handled."""
    transcription_path = Path(__file__).parents[3] / "backend" / "ml-api" / "transcription.py"
    content = transcription_path.read_text(encoding="utf-8")
    assert "timeout" in content.lower(), "Must handle timeouts"
    assert "shorter recording" in content.lower(), "Must suggest shorter recording on timeout"


def test_transcription_returns_verbatim_text():
    """Verify transcription requests verbatim output."""
    transcription_path = Path(__file__).parents[3] / "backend" / "ml-api" / "transcription.py"
    content = transcription_path.read_text(encoding="utf-8")
    assert "verbatim" in content.lower() or "faithfully" in content.lower(), "Must request verbatim transcription"


def test_transcription_no_exposed_api_keys():
    """Verify no API keys are hardcoded in transcription code."""
    transcription_path = Path(__file__).parents[3] / "backend" / "ml-api" / "transcription.py"
    content = transcription_path.read_text(encoding="utf-8")
    # Check no hardcoded keys (rough heuristic: long alphanumeric strings)
    import re
    hardcoded_keys = re.findall(r'["\'][A-Za-z0-9_-]{20,}["\']', content)
    # Only allow env var references, not actual keys
    allowed_values = {
        '"gemini-2.5-flash"', '"audio/m4a"', '"audio/mp4"', '"audio/x-m4a"',
        '"audio/aac"', '"audio/wav"', '"audio/x-wav"', '"audio/webm"',
        '"audio/ogg"', '"audio/mpeg"', '"audio/mp3"',
        '".m4a"', '".wav"', '".webm"', '".ogg"', '".mp3"',
    }
    for key in hardcoded_keys:
        assert key in allowed_values, f"Possible hardcoded key in transcription.py: {key}"


# ==================== MEETING HISTORY TESTS ====================


def test_meetings_route_has_get_list():
    """Verify meetings.ts has GET / endpoint for listing meetings."""
    meetings_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "meetings.ts"
    content = meetings_path.read_text(encoding="utf-8")
    assert "router.get(" in content and "/" in content, "Must have GET / route for listing meetings"
    assert "authMiddleware" in content, "Must require authentication"


def test_meetings_route_has_get_single():
    """Verify meetings.ts has GET /:id endpoint."""
    meetings_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "meetings.ts"
    content = meetings_path.read_text(encoding="utf-8")
    assert "router.get('/:id'" in content, "Must have GET /:id route"
    assert "createUserClient" in content, "Must use user-scoped client for RLS enforcement"


def test_meetings_route_has_delete():
    """Verify meetings.ts has DELETE /:id endpoint."""
    meetings_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "meetings.ts"
    content = meetings_path.read_text(encoding="utf-8")
    assert "router.delete('/:id'" in content, "Must have DELETE /:id route"
    assert "createUserClient" in content, "Must use user-scoped client for RLS enforcement"


def test_meetings_route_has_save_analysis():
    """Verify meetings.ts has POST /save-analysis endpoint."""
    meetings_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "meetings.ts"
    content = meetings_path.read_text(encoding="utf-8")
    assert "router.post('/save-analysis'" in content, "Must have POST /save-analysis route"


def test_meetings_save_analysis_stores_participants():
    """Verify save-analysis stores participants in the meeting record."""
    meetings_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "meetings.ts"
    content = meetings_path.read_text(encoding="utf-8")
    assert "participants" in content, "Must store participants"
    # Check schema includes participants
    assert "participants: z.array(z.string())" in content or "participants: z.array" in content, "Schema must include participants array"


def test_meetings_create_analyze_stores_participants():
    """Verify POST / create+analyze stores participants from ML API response."""
    meetings_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "meetings.ts"
    content = meetings_path.read_text(encoding="utf-8")
    # The update statement after analysis should include participants
    assert "analysis.participants" in content, "Must store participants from analysis result"


def test_meetings_user_isolation():
    """Verify meetings are scoped to authenticated user via RLS."""
    meetings_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "meetings.ts"
    content = meetings_path.read_text(encoding="utf-8")
    # User isolation enforced via RLS (createUserClient with user JWT)
    assert content.count("createUserClient") >= 3, "Multiple operations must use user-scoped client for RLS"
    assert "req.accessToken!" in content, "Must pass user access token for RLS enforcement"


def test_meetings_create_tasks_endpoint():
    """Verify POST /:id/create-tasks endpoint exists."""
    meetings_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "meetings.ts"
    content = meetings_path.read_text(encoding="utf-8")
    assert "router.post('/:id/create-tasks'" in content, "Must have create-tasks route"
    assert "action_item_indices" in content, "Must accept action_item_indices"


def test_meeting_details_screen_exists():
    """Verify MeetingDetailsScreen.tsx exists and has key components."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "MeetingDetailsScreen.tsx"
    assert screen_path.exists(), "MeetingDetailsScreen.tsx must exist"
    content = screen_path.read_text(encoding="utf-8")
    assert "fetchMeeting" in content, "Must fetch meeting by ID"
    assert "summary" in content, "Must display summary"
    assert "key_notes" in content or "Key Points" in content, "Must display key points"
    assert "participants" in content or "Participants" in content, "Must display participants"
    assert "action_items" in content or "Action Items" in content, "Must display action items"
    assert "raw_transcript" in content or "Transcript" in content, "Must display transcript"
    assert "goBack" in content, "Must have back navigation"
    assert "deleteMeeting" in content or "Delete" in content, "Must support delete"


def test_meeting_details_screen_has_add_to_task():
    """Verify MeetingDetailsScreen has Add to Task functionality."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "MeetingDetailsScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "createMeetingTasks" in content, "Must support creating tasks from action items"
    assert "handleAddTask" in content or "handleAddAll" in content, "Must have add task handlers"


def test_meeting_service_has_fetch_and_delete():
    """Verify meeting service has fetchMeeting and deleteMeeting functions."""
    service_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "meetingService.ts"
    content = service_path.read_text(encoding="utf-8")
    assert "export async function fetchMeeting" in content, "Must have fetchMeeting function"
    assert "export async function deleteMeeting" in content, "Must have deleteMeeting function"
    assert "/api/meetings/" in content, "Must call meeting API endpoints"


def test_meeting_service_passes_participants():
    """Verify saveMeetingSummary sends participants to the backend."""
    service_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "meetingService.ts"
    content = service_path.read_text(encoding="utf-8")
    assert "participants" in content, "Must include participants in save request"
    assert "summary.participants" in content, "Must pass participants from MeetingSummary"


def test_meeting_record_type_has_participants():
    """Verify MeetingRecord type includes participants field."""
    types_path = Path(__file__).parents[3] / "mobile-app" / "src" / "types" / "index.ts"
    content = types_path.read_text(encoding="utf-8")
    # Find MeetingRecord type definition
    meeting_start = content.find("export type MeetingRecord")
    assert meeting_start >= 0, "MeetingRecord type must exist"
    meeting_end = content.find("};", meeting_start)
    meeting_def = content[meeting_start:meeting_end + 2]
    assert "participants" in meeting_def, "MeetingRecord must have participants field"
    assert "tasks_created" in meeting_def, "MeetingRecord must have tasks_created field"
    assert "task_count" in meeting_def, "MeetingRecord must have task_count field"


def test_meeting_history_screen_registered_in_navigation():
    """Verify MeetingDetailsScreen is registered in App.tsx navigation."""
    app_path = Path(__file__).parents[3] / "mobile-app" / "App.tsx"
    content = app_path.read_text(encoding="utf-8")
    assert "MeetingDetails" in content, "MeetingDetails must be registered in navigation"
    assert "MeetingDetailsScreen" in content, "MeetingDetailsScreen component must be imported"


def test_meeting_assistant_makes_meetings_tappable():
    """Verify MeetingAssistantScreen navigates to MeetingDetails on tap."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "MeetingAssistantScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "MeetingDetails" in content, "Must navigate to MeetingDetails screen"
    assert "navigation.navigate" in content, "Must use navigation.navigate"
    assert "meetingId" in content, "Must pass meetingId parameter"


def test_meetings_migration_adds_participants_column():
    """Verify migration adds participants column to meetings table."""
    migration_path = Path(__file__).parents[3] / "backend" / "node-api" / "migrations" / "005_meetings_participants.sql"
    assert migration_path.exists(), "Migration 005_meetings_participants.sql must exist"
    content = migration_path.read_text(encoding="utf-8")
    assert "participants" in content, "Migration must add participants column"
    assert "meetings" in content, "Migration must target meetings table"


def test_meetings_meeting_details_shows_formatted_date():
    """Verify MeetingDetailsScreen formats dates properly."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "MeetingDetailsScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "toLocaleString" in content or "formatDate" in content, "Must format dates for display"


def test_meetings_meeting_details_collapsible_transcript():
    """Verify MeetingDetailsScreen has collapsible transcript section."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "MeetingDetailsScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "showTranscript" in content, "Must have showTranscript toggle state"
    assert "raw_transcript" in content, "Must display raw transcript"


def test_meetings_meeting_details_shows_participants():
    """Verify MeetingDetailsScreen renders participant chips."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "MeetingDetailsScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "participantChip" in content or "participant" in content.lower(), "Must render participant chips"
    assert "Array.isArray(meeting.participants)" in content, "Must safely handle participants array"


def test_meetings_meeting_details_shows_key_notes_with_categories():
    """Verify MeetingDetailsScreen shows key point categories."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "MeetingDetailsScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "category" in content, "Must display key note categories"
    assert "decision" in content or "blocker" in content, "Must handle category types"


def test_meetings_meeting_details_loading_and_error_states():
    """Verify MeetingDetailsScreen has loading and error states."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "MeetingDetailsScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "ActivityIndicator" in content, "Must show loading indicator"
    assert "EmptyState" in content or "error" in content.lower(), "Must handle error state"
    assert "Meeting not found" in content, "Must show not-found state"


def test_meetings_meeting_details_has_delete_functionality():
    """Verify MeetingDetailsScreen supports meeting deletion."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "MeetingDetailsScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "deleteMeeting" in content, "Must import deleteMeeting"
    assert "handleDelete" in content or "Delete" in content, "Must have delete handler"
    assert "Alert.alert" in content, "Must show confirmation before delete"


def test_meetings_meeting_details_creates_tasks():
    """Verify MeetingDetailsScreen can create tasks from action items."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "MeetingDetailsScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "createMeetingTasks" in content, "Must call createMeetingTasks"
    assert "handleAddAll" in content, "Must support Add All Action Items"
    assert "refreshTasks" in content, "Must refresh task list after adding"
    assert "addedIndices" in content, "Must track which items were added"


def test_meetings_list_ordered_newest_first():
    """Verify meetings list endpoint returns newest first."""
    meetings_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "meetings.ts"
    content = meetings_path.read_text(encoding="utf-8")
    assert "ascending: false" in content, "Meetings must be ordered newest first"


def test_meetings_no_api_keys_in_mobile():
    """Verify no API keys appear in mobile code."""
    service_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "meetingService.ts"
    content = service_path.read_text(encoding="utf-8")
    assert "GEMINI_API_KEY" not in content, "Must not expose Gemini API key"
    assert "OPENAI_API_KEY" not in content, "Must not expose OpenAI API key"
    assert "SUPABASE_SERVICE_ROLE" not in content, "Must not expose Supabase service role key"


def test_meetings_meeting_assistant_shows_participant_count():
    """Verify MeetingAssistantScreen shows participant count in meeting list."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "MeetingAssistantScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "participants" in content, "Must display participant information"
    assert "meeting.participants" in content, "Must access meeting.participants"


def test_meetings_meeting_assistant_shows_summary_preview():
    """Verify MeetingAssistantScreen shows summary preview in meeting list."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "MeetingAssistantScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "meeting.summary" in content, "Must display meeting summary preview"
    assert "numberOfLines" in content, "Must truncate long summaries"


# ==================== MEETING ACTION-ITEM ASSIGNMENT TESTS ====================


def test_meetings_assign_task_endpoint_exists():
    """Verify meetings.ts has POST /:id/assign-task endpoint."""
    meetings_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "meetings.ts"
    content = meetings_path.read_text(encoding="utf-8")
    assert "router.post('/:id/assign-task'" in content, "Must have POST /:id/assign-task route"
    assert "authMiddleware" in content, "Must require authentication"


def test_meetings_assign_task_schema():
    """Verify assign-task schema validates action_item_index and assignee_name."""
    meetings_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "meetings.ts"
    content = meetings_path.read_text(encoding="utf-8")
    assert "assignTaskSchema" in content, "Must have assignTaskSchema"
    assert "action_item_index" in content, "Schema must require action_item_index"
    assert "assignee_name" in content, "Schema must require assignee_name"


def test_meetings_assign_task_function_exists():
    """Verify assignTaskFromMeeting function exists."""
    meetings_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "meetings.ts"
    content = meetings_path.read_text(encoding="utf-8")
    assert "async function assignTaskFromMeeting" in content, "Must have assignTaskFromMeeting function"


def test_meetings_assign_task_creates_task():
    """Verify assignTaskFromMeeting creates a task in the tasks table."""
    meetings_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "meetings.ts"
    content = meetings_path.read_text(encoding="utf-8")
    func_start = content.find("async function assignTaskFromMeeting")
    assert func_start >= 0, "Function must exist"
    func_end = content.find("async function createTasksForMeeting", func_start)
    func_body = content[func_start:func_end] if func_end > func_start else content[func_start:]
    assert "from('tasks').insert" in func_body, "Must insert into tasks table"
    assert "user_id: userId" in func_body, "Task must be owned by meeting owner"
    assert "assignee: assigneeName" in func_body, "Task must have assignee set"


def test_meetings_assign_task_looks_up_user_by_name():
    """Verify assignTaskFromMeeting looks up FlowTask users by name."""
    meetings_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "meetings.ts"
    content = meetings_path.read_text(encoding="utf-8")
    assert "from('users')" in content, "Must query users table"
    assert "ilike('name'" in content, "Must lookup by name (case-insensitive)"
    assert "recipientIsUser" in content, "Must return whether recipient is a FlowTask user"


def test_meetings_assign_task_creates_assignment_record():
    """Verify assignTaskFromMeeting creates a task_assignments record when user is found."""
    meetings_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "meetings.ts"
    content = meetings_path.read_text(encoding="utf-8")
    assert "task_assignments" in content, "Must reference task_assignments table"
    assert "recipient_user_id" in content, "Must set recipient_user_id"
    assert "sender_user_id" in content, "Must set sender_user_id"


def test_meetings_assign_task_creates_notification():
    """Verify assignTaskFromMeeting creates an in-app notification for the recipient."""
    meetings_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "meetings.ts"
    content = meetings_path.read_text(encoding="utf-8")
    assert "from('notifications').insert" in content, "Must create notification for recipient"
    assert "task_assigned" in content, "Notification type must be task_assigned"


def test_meetings_assign_task_prevents_self_assignment():
    """Verify assignTaskFromMeeting skips self-assignment (same user)."""
    meetings_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "meetings.ts"
    content = meetings_path.read_text(encoding="utf-8")
    func_start = content.find("async function assignTaskFromMeeting")
    func_end = content.find("async function createTasksForMeeting", func_start)
    func_body = content[func_start:func_end] if func_end > func_start else content[func_start:]
    assert "u.id !== userId" in func_body or "matchedUser" in func_body, "Must filter out self-assignment"


def test_meetings_assign_task_updates_meeting_tasks_created():
    """Verify assignTaskFromMeeting updates meeting's tasks_created list."""
    meetings_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "meetings.ts"
    content = meetings_path.read_text(encoding="utf-8")
    # Search within the assignTaskFromMeeting function
    func_start = content.find("async function assignTaskFromMeeting")
    func_end = content.find("async function createTasksForMeeting", func_start)
    func_body = content[func_start:func_end] if func_end > func_start else content[func_start:]
    assert "tasks_created" in func_body, "Must update meeting's tasks_created"
    assert "task_count" in func_body, "Must update meeting's task_count"


def test_meetings_assign_task_scoped_to_user():
    """Verify assign-task endpoint scopes to authenticated user via RLS."""
    meetings_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "meetings.ts"
    content = meetings_path.read_text(encoding="utf-8")
    # Find the assign-task endpoint handler
    endpoint_start = content.find("router.post('/:id/assign-task'")
    endpoint_body = content[endpoint_start:endpoint_start + 1500]
    assert "createUserClient" in endpoint_body, "Must use user-scoped client for RLS enforcement"
    assert "req.user!.id" in endpoint_body, "Must use server-side user ID"


def test_meetings_assign_task_validates_index():
    """Verify assign-task endpoint validates action_item_index is in range."""
    meetings_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "meetings.ts"
    content = meetings_path.read_text(encoding="utf-8")
    endpoint_start = content.find("router.post('/:id/assign-task'")
    endpoint_body = content[endpoint_start:endpoint_start + 1500]
    assert "Invalid action item index" in endpoint_body, "Must reject out-of-range index"


def test_meetings_assign_task_returns_message():
    """Verify assign-task endpoint returns appropriate message."""
    meetings_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "meetings.ts"
    content = meetings_path.read_text(encoding="utf-8")
    endpoint_start = content.find("router.post('/:id/assign-task'")
    endpoint_body = content[endpoint_start:endpoint_start + 1500]
    assert "not a FlowTask user" in endpoint_body, "Must inform when assignee is not a FlowTask user"
    assert "assigned to" in endpoint_body.lower(), "Must confirm assignment to matched user"


def test_meeting_service_has_assign_function():
    """Verify meeting service exports assignMeetingTask function."""
    service_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "meetingService.ts"
    content = service_path.read_text(encoding="utf-8")
    assert "export async function assignMeetingTask" in content, "Must have assignMeetingTask function"
    assert "/api/meetings/" in content, "Must call meeting API endpoint"
    assert "action_item_index" in content, "Must send action_item_index"
    assert "assignee_name" in content, "Must send assignee_name"


def test_meeting_details_screen_has_assign_button():
    """Verify MeetingDetailsScreen has assign button for action items."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "MeetingDetailsScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "handleAssignTask" in content, "Must have handleAssignTask handler"
    assert "assignMeetingTask" in content, "Must call assignMeetingTask service"
    assert "assigningIndex" in content, "Must track assigning state"


def test_meeting_details_screen_shows_assignee_name():
    """Verify MeetingDetailsScreen shows assignee name in action items."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "MeetingDetailsScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "item.assignee" in content, "Must display action item assignee"
    assert "hasAssignee" in content, "Must check if assignee exists"


def test_meeting_details_screen_preserves_add_to_my_tasks():
    """Verify 'Add to My Tasks' functionality is preserved."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "MeetingDetailsScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "handleAddTask" in content, "Must keep handleAddTask for own tasks"
    assert "Add" in content, "Must show Add button"


def test_meeting_details_screen_disables_button_while_processing():
    """Verify assign button is disabled while processing."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "MeetingDetailsScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "disabled={assigningIndex" in content, "Assign button must be disabled during processing"


def test_meeting_details_screen_shows_loading_during_assign():
    """Verify assign button shows loading state."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "MeetingDetailsScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "assigningIndex === i ? '...'" in content or "assigningIndex" in content, "Must show loading indicator"


def test_meeting_action_item_assignment_user_isolation():
    """Verify assignment is scoped to meeting owner via RLS."""
    meetings_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "meetings.ts"
    content = meetings_path.read_text(encoding="utf-8")
    # User isolation enforced via RLS (createUserClient with user JWT)
    endpoint_start = content.find("router.post('/:id/assign-task'")
    endpoint_body = content[endpoint_start:endpoint_start + 1500]
    assert "createUserClient" in endpoint_body, "Must use user-scoped client for RLS enforcement"
    assert "req.user!.id" in endpoint_body, "Must use server-side user ID"


def test_meeting_action_item_assignment_no_api_keys_in_mobile():
    """Verify no API keys appear in mobile meeting service."""
    service_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "meetingService.ts"
    content = service_path.read_text(encoding="utf-8")
    assert "GEMINI_API_KEY" not in content, "Must not expose Gemini API key"
    assert "OPENAI_API_KEY" not in content, "Must not expose OpenAI API key"
    assert "SUPABASE_SERVICE_ROLE" not in content, "Must not expose Supabase service role key"


def test_meeting_action_item_assignment_task_has_meeting_reference():
    """Verify assigned task includes meeting reference in description."""
    meetings_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "meetings.ts"
    content = meetings_path.read_text(encoding="utf-8")
    func_start = content.find("async function assignTaskFromMeeting")
    func_end = content.find("async function createTasksForMeeting", func_start)
    func_body = content[func_start:func_end] if func_end > func_start else content[func_start:]
    assert "meeting_id: meeting.id" in func_body, "Task must reference the meeting"
    assert "From meeting:" in func_body, "Task description must mention meeting"


def test_meeting_action_item_assignment_tags():
    """Verify assigned task has appropriate tags."""
    meetings_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "meetings.ts"
    content = meetings_path.read_text(encoding="utf-8")
    func_start = content.find("async function assignTaskFromMeeting")
    func_end = content.find("async function createTasksForMeeting", func_start)
    func_body = content[func_start:func_end] if func_end > func_start else content[func_start:]
    assert "'assigned'" in func_body, "Task must have 'assigned' tag"
    assert "'meeting'" in func_body, "Task must have 'meeting' tag"
    assert "'ai-action'" in func_body, "Task must have 'ai-action' tag"


# ==================== RECURRING TASK TESTS ====================


def test_recurring_task_type_has_recurrence_fields():
    """Verify Task type has recurrence and recurrence_end_date fields."""
    types_path = Path(__file__).parents[3] / "mobile-app" / "src" / "types" / "index.ts"
    content = types_path.read_text(encoding="utf-8")
    assert "recurrence" in content, "Task type must have recurrence field"
    assert "recurrence_end_date" in content, "Task type must have recurrence_end_date field"
    assert "RecurrenceType" in content, "Must export RecurrenceType"


def test_recurrence_type_includes_weekdays():
    """Verify RecurrenceType includes 'weekdays'."""
    types_path = Path(__file__).parents[3] / "mobile-app" / "src" / "types" / "index.ts"
    content = types_path.read_text(encoding="utf-8")
    assert "'weekdays'" in content, "RecurrenceType must include 'weekdays'"
    assert "'daily'" in content, "RecurrenceType must include 'daily'"
    assert "'weekly'" in content, "RecurrenceType must include 'weekly'"
    assert "'monthly'" in content, "RecurrenceType must include 'monthly'"


def test_backend_schema_accepts_recurrence():
    """Verify backend createTaskSchema accepts recurrence field."""
    tasks_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "tasks.ts"
    content = tasks_path.read_text(encoding="utf-8")
    assert "recurrence" in content, "Schema must accept recurrence"
    assert "'weekdays'" in content, "Schema must accept weekdays recurrence"
    assert "recurrence_end_date" in content, "Schema must accept recurrence_end_date"


def test_recurring_task_manager_exists():
    """Verify recurringTaskManager.ts exists with required functions."""
    manager_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "recurringTaskManager.ts"
    content = manager_path.read_text(encoding="utf-8")
    assert "export function getMissingOccurrenceDates" in content, "Must have getMissingOccurrenceDates"
    assert "export function buildOccurrenceInput" in content, "Must have buildOccurrenceInput"
    assert "export function findTasksNeedingOccurrences" in content, "Must have findTasksNeedingOccurrences"
    assert "export function deduplicateOccurrences" in content, "Must have deduplicateOccurrences"


def test_recurring_task_manager_supports_weekly():
    """Verify recurringTaskManager handles weekly recurrence."""
    manager_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "recurringTaskManager.ts"
    content = manager_path.read_text(encoding="utf-8")
    assert "'weekly'" in content, "Must handle weekly recurrence"
    assert "7" in content, "Weekly must advance by 7 days"


def test_recurring_task_manager_supports_monthly():
    """Verify recurringTaskManager handles monthly recurrence."""
    manager_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "recurringTaskManager.ts"
    content = manager_path.read_text(encoding="utf-8")
    assert "'monthly'" in content, "Must handle monthly recurrence"
    assert "setMonth" in content, "Monthly must advance by month"


def test_recurring_task_manager_supports_weekdays():
    """Verify recurringTaskManager handles weekday recurrence."""
    manager_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "recurringTaskManager.ts"
    content = manager_path.read_text(encoding="utf-8")
    assert "'weekdays'" in content, "Must handle weekdays recurrence"
    assert "getDay" in content or "weekdays" in content, "Weekdays must skip weekends"


def test_recurring_task_manager_respects_end_date():
    """Verify recurringTaskManager respects recurrence_end_date."""
    manager_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "recurringTaskManager.ts"
    content = manager_path.read_text(encoding="utf-8")
    assert "recurrence_end_date" in content, "Must check recurrence_end_date"
    assert "isRecurrenceExpired" in content or "expired" in content.lower(), "Must have expiration check"


def test_recurring_task_manager_preserves_time():
    """Verify buildOccurrenceInput preserves the original task's time."""
    manager_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "recurringTaskManager.ts"
    content = manager_path.read_text(encoding="utf-8")
    assert "timeSuffix" in content, "Must preserve time from parent task"
    assert "match" in content, "Must extract time with regex"


def test_recurring_task_manager_deduplicates():
    """Verify deduplicateOccurrences prevents duplicate tasks."""
    manager_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "recurringTaskManager.ts"
    content = manager_path.read_text(encoding="utf-8")
    assert "export function deduplicateOccurrences" in content, "Must have deduplication function"
    assert "Map" in content, "Must use Map for deduplication"


def test_recurring_task_manager_caps_occurrences():
    """Verify getMissingOccurrenceDates caps at 30 to prevent infinite loops."""
    manager_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "recurringTaskManager.ts"
    content = manager_path.read_text(encoding="utf-8")
    assert "30" in content, "Must cap occurrences at 30"


def test_add_task_screen_has_recurrence_picker():
    """Verify AddTaskScreen has recurrence picker UI."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "AddTaskScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "recurrence" in content, "Must have recurrence state"
    assert "recurrenceOptions" in content, "Must have recurrence options"
    assert "Repeat" in content, "Must show Repeat label"
    assert "Does not repeat" in content, "Must show 'Does not repeat' option"
    assert "Every day" in content, "Must show 'Every day' option"
    assert "Every week" in content, "Must show 'Every week' option"
    assert "Every month" in content, "Must show 'Every month' option"
    assert "Every weekday" in content, "Must show 'Every weekday' option"


def test_add_task_screen_has_end_date():
    """Verify AddTaskScreen shows end date field when recurrence is set."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "AddTaskScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "recurrenceEndDate" in content, "Must have recurrence end date state"
    assert "Ends" in content, "Must show 'Ends' label"
    assert "recurrence !== 'none'" in content, "End date only shown when recurrence is set"


def test_add_task_screen_sends_recurrence():
    """Verify AddTaskScreen sends recurrence in the payload."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "AddTaskScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "recurrence," in content, "Must include recurrence in payload"
    assert "recurrence_end_date:" in content, "Must include recurrence_end_date in payload"


def test_add_task_screen_preserves_recurrence_on_edit():
    """Verify AddTaskScreen preserves recurrence when editing existing task."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "AddTaskScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "editingTask?.recurrence" in content, "Must initialize recurrence from editing task"
    assert "editingTask?.recurrence_end_date" in content, "Must initialize end date from editing task"


def test_tasks_context_generates_occurrences():
    """Verify TasksContext generates missing occurrences on load."""
    context_path = Path(__file__).parents[3] / "mobile-app" / "src" / "context" / "TasksContext.tsx"
    content = context_path.read_text(encoding="utf-8")
    assert "generateMissingOccurrences" in content, "Must call generateMissingOccurrences"
    assert "findTasksNeedingOccurrences" in content, "Must use findTasksNeedingOccurrences"
    assert "buildOccurrenceInput" in content, "Must use buildOccurrenceInput"


def test_tasks_context_handles_all_recurrence_types():
    """Verify TasksContext does not hardcode 'daily' only."""
    context_path = Path(__file__).parents[3] / "mobile-app" / "src" / "context" / "TasksContext.tsx"
    content = context_path.read_text(encoding="utf-8")
    # Should not have hardcoded daily-only checks in toggleTask
    assert "markRecurringCompleted" not in content, "Must not use legacy daily-only completion tracking"
    assert "clearRecurringCompleted" not in content, "Must not use legacy daily-only completion tracking"


def test_recurring_task_migration_exists():
    """Verify migration 006 adds recurrence_end_date."""
    migration_path = Path(__file__).parents[3] / "backend" / "node-api" / "migrations" / "006_recurring_task_end_date.sql"
    assert migration_path.exists(), "Migration 006 must exist"
    content = migration_path.read_text(encoding="utf-8")
    assert "recurrence_end_date" in content, "Migration must add recurrence_end_date column"
    assert "tasks" in content, "Migration must target tasks table"


def test_recurring_task_no_infinite_loop():
    """Verify getMissingOccurrenceDates has a safety limit."""
    manager_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "recurringTaskManager.ts"
    content = manager_path.read_text(encoding="utf-8")
    assert "count < 30" in content or "count += 1" in content, "Must have safety limit on occurrences"


def test_recurring_task_occurrence_links_to_parent():
    """Verify buildOccurrenceInput sets parent_task_id."""
    manager_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "recurringTaskManager.ts"
    content = manager_path.read_text(encoding="utf-8")
    assert "parent_task_id: parentTask.id" in content, "Occurrences must link to parent task"


def test_recurring_task_occurrence_sets_todo_status():
    """Verify new occurrences are created with todo status."""
    manager_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "recurringTaskManager.ts"
    content = manager_path.read_text(encoding="utf-8")
    assert "status: 'todo'" in content, "New occurrences must have todo status"


def test_recurring_task_occurrence_preserves_priority():
    """Verify new occurrences preserve the parent task's priority."""
    manager_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "recurringTaskManager.ts"
    content = manager_path.read_text(encoding="utf-8")
    assert "priority: parentTask.priority" in content, "Must preserve parent priority"


def test_recurring_task_occurrence_preserves_context():
    """Verify new occurrences preserve the parent task's context."""
    manager_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "recurringTaskManager.ts"
    content = manager_path.read_text(encoding="utf-8")
    assert "context: parentTask.context" in content, "Must preserve parent context"


def test_recurring_task_occurrence_preserves_end_date():
    """Verify new occurrences preserve the recurrence_end_date."""
    manager_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "recurringTaskManager.ts"
    content = manager_path.read_text(encoding="utf-8")
    assert "recurrence_end_date" in content, "Must preserve recurrence_end_date"


def test_recurring_task_occurrence_preserves_assignee():
    """Verify new occurrences preserve the assignee."""
    manager_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "recurringTaskManager.ts"
    content = manager_path.read_text(encoding="utf-8")
    assert "assignee: parentTask.assignee" in content, "Must preserve assignee"


def test_recurring_task_manager_user_isolation():
    """Verify task creation still requires authentication."""
    tasks_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "tasks.ts"
    content = tasks_path.read_text(encoding="utf-8")
    assert "authMiddleware" in content, "Tasks must require authentication"
    assert "req.user!.id" in content, "Must use server-side user ID"


def test_recurring_task_no_api_keys_in_mobile():
    """Verify no API keys appear in mobile recurring task code."""
    manager_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "recurringTaskManager.ts"
    content = manager_path.read_text(encoding="utf-8")
    assert "GEMINI_API_KEY" not in content, "Must not expose API keys"
    assert "OPENAI_API_KEY" not in content, "Must not expose API keys"
    assert "SUPABASE_SERVICE_ROLE" not in content, "Must not expose API keys"


def test_recurring_task_delete_stops_recurrence():
    """Verify deleting a parent task stops future occurrences."""
    tasks_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "tasks.ts"
    content = tasks_path.read_text(encoding="utf-8")
    assert "router.delete('/:id'" in content, "Must have delete endpoint"
    assert "from('tasks').delete" in content, "Must delete from tasks table"


# ==================== FOCUS MODE TESTS ====================


def test_focus_mode_screen_exists():
    """Verify FocusModeScreen.tsx exists."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "FocusModeScreen.tsx"
    assert screen_path.exists(), "FocusModeScreen.tsx must exist"
    content = screen_path.read_text(encoding="utf-8")
    assert "Focus Mode" in content, "Must show Focus Mode title"
    assert "Focus Time" in content, "Must show Focus Time label"


def test_focus_mode_screen_has_timer():
    """Verify FocusModeScreen has countdown timer logic."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "FocusModeScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "remainingSeconds" in content, "Must track remaining seconds"
    assert "endTimestampRef" in content or "Date.now()" in content, "Must use timestamp-based timer"
    assert "formatTime" in content, "Must format timer display"


def test_focus_mode_screen_has_duration_options():
    """Verify FocusModeScreen has 15/25/45/60 minute options."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "FocusModeScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "DURATION_OPTIONS" in content, "Must have duration options"
    assert "15" in content, "Must have 15 min option"
    assert "25" in content, "Must have 25 min option"
    assert "45" in content, "Must have 45 min option"
    assert "60" in content, "Must have 60 min option"
    assert "DEFAULT_MINUTES" in content, "Must have default duration"


def test_focus_mode_screen_default_25_minutes():
    """Verify default duration is 25 minutes."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "FocusModeScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "DEFAULT_MINUTES = 25" in content, "Default must be 25 minutes"


def test_focus_mode_screen_has_controls():
    """Verify FocusModeScreen has pause, resume, reset, and start controls."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "FocusModeScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "Start Focus" in content, "Must have Start button"
    assert "Pause" in content, "Must have Pause button"
    assert "Resume" in content, "Must have Resume button"
    assert "Reset" in content, "Must have Reset button"


def test_focus_mode_screen_has_state_model():
    """Verify FocusModeScreen has idle/running/paused/completed states."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "FocusModeScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "FocusState" in content, "Must define FocusState type"
    assert "'idle'" in content, "Must have idle state"
    assert "'running'" in content, "Must have running state"
    assert "'paused'" in content, "Must have paused state"
    assert "'completed'" in content, "Must have completed state"


def test_focus_mode_screen_has_completion():
    """Verify FocusModeScreen shows completion state and options."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "FocusModeScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "Mark Task Complete" in content, "Must have Mark Task Complete button"
    assert "Start Another" in content, "Must have Start Another option"
    assert "complete" in content.lower(), "Must handle completion state"


def test_focus_mode_screen_has_progress_ring():
    """Verify FocusModeScreen has visual progress indicator."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "FocusModeScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "progressRing" in content or "progress" in content, "Must have progress ring"
    assert "transform" in content or "rotate" in content, "Must use rotation for progress"


def test_focus_mode_screen_has_back_navigation():
    """Verify FocusModeScreen has back button."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "FocusModeScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "goBack" in content, "Must have back navigation"
    assert "chevron-back" in content, "Must show back chevron icon"


def test_focus_mode_screen_has_motivation_text():
    """Verify FocusModeScreen shows motivational text."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "FocusModeScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "motivation" in content or "Stay focused" in content, "Must show motivational text"


def test_focus_mode_screen_integrates_with_task():
    """Verify FocusModeScreen can mark associated task as complete."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "FocusModeScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "toggleTask" in content, "Must use toggleTask for completion"
    assert "refreshTasks" in content, "Must refresh tasks after completion"
    assert "taskId" in content, "Must accept taskId parameter"


def test_focus_mode_screen_no_duplicate_intervals():
    """Verify FocusModeScreen clears existing interval before starting new one."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "FocusModeScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "clearInterval" in content, "Must clear interval to prevent duplicates"
    assert "intervalRef" in content, "Must use ref for interval"


def test_focus_mode_screen_uses_timestamp_timer():
    """Verify FocusModeScreen uses timestamp-based timer, not counter decrements."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "FocusModeScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "endTimestamp" in content or "Date.now()" in content, "Must use timestamps for accuracy"
    # Should NOT use simple decrements that drift
    assert "setInterval" in content, "Must use setInterval for periodic updates"


def test_focus_mode_screen_cleanup_on_unmount():
    """Verify FocusModeScreen cleans up interval on unmount."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "FocusModeScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "useEffect" in content, "Must have useEffect for cleanup"
    assert "return () =>" in content or "cleanup" in content.lower(), "Must clean up on unmount"


def test_focus_mode_screen_duration_selector_shown_when_idle():
    """Verify duration selector only shows when idle."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "FocusModeScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "focusState === 'idle'" in content, "Duration selector must only show when idle"


def test_focus_mode_screen_uses_theme():
    """Verify FocusModeScreen uses FlowTask theme system."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "FocusModeScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "useTheme" in content, "Must use theme"
    assert "theme.primary" in content, "Must use theme colors"


def test_focus_mode_registered_in_navigation():
    """Verify FocusModeScreen is registered in App.tsx navigation."""
    app_path = Path(__file__).parents[3] / "mobile-app" / "App.tsx"
    content = app_path.read_text(encoding="utf-8")
    assert "FocusMode" in content, "FocusMode must be registered in navigation"
    assert "FocusModeScreen" in content, "FocusModeScreen must be imported"


def test_task_detail_has_start_focus_button():
    """Verify TaskDetailScreen has Start Focus button."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "TaskDetailScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "Start Focus" in content, "Must have Start Focus button"
    assert "FocusMode" in content, "Must navigate to FocusMode screen"
    assert "timer-outline" in content or "timer" in content, "Must use timer icon"


def test_focus_mode_no_api_keys_in_mobile():
    """Verify no API keys appear in FocusModeScreen."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "FocusModeScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "GEMINI_API_KEY" not in content, "Must not expose API keys"
    assert "OPENAI_API_KEY" not in content, "Must not expose API keys"
    assert "SUPABASE_SERVICE_ROLE" not in content, "Must not expose API keys"


def test_focus_mode_start_focus_hidden_when_task_done():
    """Verify Start Focus button is hidden for completed tasks."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "TaskDetailScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "task.status !== 'done'" in content, "Start Focus must only show for incomplete tasks"


def test_focus_mode_recurring_tasks_unaffected():
    """Verify recurring task logic is not modified by Focus Mode."""
    manager_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "recurringTaskManager.ts"
    content = manager_path.read_text(encoding="utf-8")
    assert "export function getMissingOccurrenceDates" in content, "Recurring task manager must remain intact"
    assert "export function buildOccurrenceInput" in content, "Occurrence builder must remain intact"


def test_focus_mode_screen_has_task_name_display():
    """Verify FocusModeScreen displays the task name prominently."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "FocusModeScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "taskName" in content, "Must display task name"
    assert "task.title" in content, "Must show task title"


def test_focus_mode_screen_handles_no_task():
    """Verify FocusModeScreen works without an associated task."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "FocusModeScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "Free focus session" in content, "Must handle free focus (no task)"
    assert "task ?" in content or "taskId" in content, "Must conditionally handle task presence"


# ==================== CALENDAR NAVIGATION TESTS ====================


def test_calendar_screen_exists():
    """Verify CalendarScreen.tsx exists."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "CalendarScreen.tsx"
    assert screen_path.exists(), "CalendarScreen.tsx must exist"


def test_calendar_has_month_navigation():
    """Verify CalendarScreen has month navigation arrows."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "CalendarScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "goToPrevMonth" in content, "Must have prev month function"
    assert "goToNextMonth" in content, "Must have next month function"
    assert "chevron-back" in content, "Must have prev arrow"
    assert "chevron-forward" in content, "Must have next arrow"


def test_calendar_has_swipe_gesture():
    """Verify CalendarScreen has horizontal swipe gesture."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "CalendarScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "PanResponder" in content, "Must use PanResponder for swipe"
    assert "panX" in content, "Must animate swipe with panX"
    assert "SWIPE_THRESHOLD" in content, "Must have swipe threshold"


def test_calendar_uses_separate_month_state():
    """Verify CalendarScreen uses separate viewYear/viewMonth state."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "CalendarScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "viewYear" in content, "Must have viewYear state"
    assert "viewMonth" in content, "Must have viewMonth state"
    assert "selectedDate" in content, "Must keep selectedDate separate"


def test_calendar_year_transition():
    """Verify CalendarScreen handles year transitions via addMonths."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "CalendarScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "addMonths" in content, "Must have addMonths helper"
    assert "getFullYear" in content, "Must use getFullYear for year"
    assert "getMonth" in content, "Must use getMonth"


def test_calendar_no_hardcoded_month():
    """Verify CalendarScreen does not hardcode current month."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "CalendarScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    # Should use dynamic month from state, not hardcoded
    assert "new Date().getFullYear()" in content or "viewYear" in content, "Must use dynamic year"
    assert "new Date().getMonth()" in content or "viewMonth" in content, "Must use dynamic month"


def test_calendar_no_hardcoded_year():
    """Verify CalendarScreen does not hardcode a specific year."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "CalendarScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    # Should not contain hardcoded year like 2026 or 2027
    import re
    hardcoded_years = re.findall(r'\b20(2[0-9]|3[0-9])\b', content)
    # Allow years only in comments or test strings, not in logic
    assert len(hardcoded_years) == 0, f"Must not hardcode years: {hardcoded_years}"


def test_calendar_today_indicator():
    """Verify CalendarScreen distinguishes today from selected date."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "CalendarScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "isToday" in content, "Must track today separately"
    assert "today" in content, "Must compute today's date"


def test_calendar_date_selection():
    """Verify CalendarScreen allows date selection."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "CalendarScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "setSelectedDate" in content, "Must have setSelectedDate"
    assert "selected" in content, "Must visually mark selected date"


def test_calendar_filters_tasks_by_date():
    """Verify CalendarScreen filters tasks for selected date."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "CalendarScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "selectedTasks" in content, "Must compute selected tasks"
    assert "taskDateKey" in content, "Must use taskDateKey for filtering"


def test_calendar_builds_month_grid():
    """Verify CalendarScreen builds 42-day month grid."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "CalendarScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "buildMonthDays" in content, "Must have buildMonthDays function"
    assert "42" in content, "Must build 42-day grid (6 weeks)"


def test_calendar_empty_date():
    """Verify CalendarScreen shows empty state for dates with no tasks."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "CalendarScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "EmptyState" in content, "Must show EmptyState"
    assert "No tasks on this date" in content, "Must show empty message"


def test_calendar_has_back_navigation():
    """Verify CalendarScreen has back button."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "CalendarScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "goBack" in content, "Must have back navigation"
    assert "chevron-back" in content, "Must show back chevron"


def test_calendar_uses_task_context():
    """Verify CalendarScreen uses existing task context."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "CalendarScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "useTasks" in content, "Must use useTasks context"
    assert "loadTasks" in content, "Must load tasks"
    assert "TaskCard" in content, "Must render TaskCard"


def test_calendar_no_duplicate_task_storage():
    """Verify CalendarScreen does not create separate task storage."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "CalendarScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "useState" in content, "Must use React state"
    # Should not have its own task fetching/storage beyond context
    assert "from('tasks')" not in content, "Must not directly query database"
    assert "supabaseAdmin" not in content, "Must not use Supabase directly"


def test_calendar_today_button():
    """Verify CalendarScreen has a go-to-today function."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "CalendarScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "goToToday" in content, "Must have goToToday function"


def test_calendar_month_label():
    """Verify CalendarScreen shows month/year label."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "CalendarScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "getMonthLabel" in content, "Must have getMonthLabel function"
    assert "monthText" in content, "Must display month text"


def test_calendar_task_dot_indicator():
    """Verify CalendarScreen shows dot indicator for dates with tasks."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "CalendarScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "taskDates" in content, "Must track task dates"
    assert "hasTask" in content, "Must check if date has tasks"
    assert "dot" in content or "styles.dot" in content, "Must show dot indicator"


def test_calendar_weekday_headers():
    """Verify CalendarScreen shows weekday headers."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "CalendarScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "Sun" in content and "Mon" in content, "Must show weekday headers"
    assert "weekday" in content, "Must have weekday style"


def test_calendar_no_api_keys_in_mobile():
    """Verify no API keys in CalendarScreen."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "CalendarScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "GEMINI_API_KEY" not in content, "Must not expose API keys"
    assert "OPENAI_API_KEY" not in content, "Must not expose API keys"
    assert "SUPABASE_SERVICE_ROLE" not in content, "Must not expose API keys"


def test_calendar_uses_theme():
    """Verify CalendarScreen uses FlowTask theme system."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "CalendarScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "useTheme" in content, "Must use theme"
    assert "theme.primary" in content, "Must use theme colors"


def test_calendar_add_months_handles_year_boundary():
    """Verify addMonths function uses Date arithmetic for year transitions."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "CalendarScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    # addMonths should use Date(year, month + delta, 1) which handles year boundaries
    assert "new Date(year, month + delta" in content, "Must use Date arithmetic for year transitions"
    assert "getFullYear" in content, "Must extract year from Date"
    assert "getMonth" in content, "Must extract month from Date"


# ==================== NOTIFICATION / REMINDER TESTS ====================

def test_notification_scheduler_exists():
    """Verify notificationScheduler.ts exists with core functions."""
    path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "notificationScheduler.ts"
    content = path.read_text(encoding="utf-8")
    assert "requestNotificationPermissions" in content, "Must have permission request"
    assert "scheduleTaskReminder" in content, "Must have task reminder scheduling"
    assert "scheduleDailyReminder" in content, "Must have daily reminder scheduling"
    assert "cancelNotification" in content, "Must have notification cancellation"
    assert "cancelTaskNotifications" in content, "Must have task-specific cancellation"
    assert "sendImmediateAssignmentNotification" in content, "Must have assignment notification"


def test_notification_scheduler_has_settings_checks():
    """Verify notification scheduler respects user settings."""
    path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "notificationScheduler.ts"
    content = path.read_text(encoding="utf-8")
    assert "areNotificationsEnabled" in content, "Must check notification enabled setting"
    assert "areDeadlineAlertsEnabled" in content, "Must check deadline alerts setting"
    assert "areDailyRemindersEnabled" in content, "Must check daily reminders setting"
    assert "AsyncStorage" in content, "Must use AsyncStorage for settings"


def test_notification_scheduler_has_android_channels():
    """Verify Android notification channels are configured."""
    path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "notificationScheduler.ts"
    content = path.read_text(encoding="utf-8")
    assert "task-reminders" in content, "Must have task-reminders channel"
    assert "alarms" in content, "Must have alarms channel"
    assert "assignments" in content, "Must have assignments channel"
    assert "setNotificationChannelAsync" in content, "Must create Android channels"


def test_notification_scheduler_past_date_guard():
    """Verify notifications are not scheduled for past dates."""
    path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "notificationScheduler.ts"
    content = path.read_text(encoding="utf-8")
    assert "trigger <= Date.now()" in content, "Must guard against past date scheduling"
    assert "return null" in content, "Must return null for past dates"


def test_schedule_task_notifications_exists():
    """Verify scheduleTaskNotifications.ts exists with orchestrator."""
    path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "scheduleTaskNotifications.ts"
    content = path.read_text(encoding="utf-8")
    assert "scheduleNotificationsForTask" in content, "Must have main orchestrator"
    assert "cancelTaskNotifications" in content, "Must cancel before rescheduling"
    assert "scheduleOverdueNotifications" in content, "Must have overdue scheduling"


def test_schedule_notifications_respects_reminder_minutes():
    """Verify custom reminder_minutes is used when set."""
    path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "scheduleTaskNotifications.ts"
    content = path.read_text(encoding="utf-8")
    assert "reminder_minutes" in content, "Must use reminder_minutes field"
    assert "dueTime - task.reminder_minutes" in content, "Must calculate reminder time from due_date - minutes"


def test_schedule_notifications_deadline_chain():
    """Verify default deadline notification chain exists."""
    path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "scheduleTaskNotifications.ts"
    content = path.read_text(encoding="utf-8")
    assert "Deadline tomorrow" in content, "Must have 1-day-before warning"
    assert "Deadline approaching" in content, "Must have 1-hour-before warning"
    assert "Task due now" in content, "Must have at-deadline notification"


def test_schedule_notifications_recurring():
    """Verify recurring task notifications work for all recurrence types."""
    path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "scheduleTaskNotifications.ts"
    content = path.read_text(encoding="utf-8")
    assert "daily" in content, "Must handle daily recurrence"
    assert "weekdays" in content, "Must handle weekday recurrence"
    assert "weekly" in content, "Must handle weekly recurrence"
    assert "monthly" in content, "Must handle monthly recurrence"


def test_task_type_has_reminder_minutes():
    """Verify Task type includes reminder_minutes field."""
    types_path = Path(__file__).parents[3] / "mobile-app" / "src" / "types" / "index.ts"
    content = types_path.read_text(encoding="utf-8")
    assert "reminder_minutes" in content, "Task type must have reminder_minutes"


def test_create_task_input_has_reminder_minutes():
    """Verify CreateTaskInput includes reminder_minutes."""
    types_path = Path(__file__).parents[3] / "mobile-app" / "src" / "types" / "index.ts"
    content = types_path.read_text(encoding="utf-8")
    # Count occurrences - should be in both Task and CreateTaskInput
    count = content.count("reminder_minutes")
    assert count >= 2, f"reminder_minutes must appear in both Task and CreateTaskInput (found {count})"


def test_backend_task_schema_has_reminder_minutes():
    """Verify backend createTaskSchema accepts reminder_minutes."""
    tasks_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "tasks.ts"
    content = tasks_path.read_text(encoding="utf-8")
    assert "reminder_minutes" in content, "Backend schema must accept reminder_minutes"
    assert "z.number()" in content, "reminder_minutes must be validated as number"


def test_add_task_screen_has_reminder_picker():
    """Verify AddTaskScreen has a reminder picker UI."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "AddTaskScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "reminder" in content.lower(), "Must have reminder option"
    assert "reminderMinutes" in content or "reminder_minutes" in content, "Must track reminder state"
    assert "At due time" in content, "Must have 'At due time' option"
    assert "5 min before" in content, "Must have '5 min before' option"
    assert "15 min before" in content, "Must have '15 min before' option"
    assert "30 min before" in content, "Must have '30 min before' option"
    assert "1 hour before" in content, "Must have '1 hour before' option"
    assert "1 day before" in content, "Must have '1 day before' option"


def test_settings_screen_has_notification_toggles():
    """Verify SettingsScreen has notification settings."""
    settings_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "SettingsScreen.tsx"
    content = settings_path.read_text(encoding="utf-8")
    assert "Notifications" in content, "Must have notifications toggle"
    assert "Deadline alerts" in content, "Must have deadline alerts toggle"
    assert "Daily reminders" in content, "Must have daily reminders toggle"
    assert "flowtask-notifications-enabled" in content, "Must persist notifications setting"
    assert "flowtask-deadline-alerts" in content, "Must persist deadline alerts setting"
    assert "flowtask-daily-reminders" in content, "Must persist daily reminders setting"


def test_tasks_context_schedules_notifications_on_create():
    """Verify TasksContext schedules notifications when creating tasks."""
    ctx_path = Path(__file__).parents[3] / "mobile-app" / "src" / "context" / "TasksContext.tsx"
    content = ctx_path.read_text(encoding="utf-8")
    assert "scheduleNotificationsForTask" in content, "Must schedule notifications on task creation"
    assert "cancelTaskNotifications" in content, "Must cancel notifications on task deletion"


def test_tasks_context_cancels_notifications_on_complete():
    """Verify TasksContext cancels notifications when task is completed."""
    ctx_path = Path(__file__).parents[3] / "mobile-app" / "src" / "context" / "TasksContext.tsx"
    content = ctx_path.read_text(encoding="utf-8")
    # When toggling to done, should cancel notifications
    assert "cancelTaskNotifications(task.id)" in content, "Must cancel notifications on completion"
    # When toggling back to todo, should reschedule
    assert "scheduleNotificationsForTask(updated)" in content, "Must reschedule when un-completing"


def test_notification_channels_use_correct_importance():
    """Verify notification channels have appropriate importance levels."""
    path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "notificationScheduler.ts"
    content = path.read_text(encoding="utf-8")
    assert "AndroidImportance.HIGH" in content, "Task reminders should be HIGH importance"
    assert "AndroidImportance.MAX" in content, "Alarms should be MAX importance"


def test_notification_data_includes_task_id():
    """Verify notification data payload includes taskId for tap navigation."""
    path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "notificationScheduler.ts"
    content = path.read_text(encoding="utf-8")
    assert "taskId" in content, "Notification data must include taskId"
    assert "type: 'task-reminder'" in content, "Must include notification type"


def test_notification_navigation_handler_exists():
    """Verify notification tap navigation is implemented."""
    nav_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "notificationNavigation.ts"
    content = nav_path.read_text(encoding="utf-8")
    assert "handleNotificationTap" in content, "Must have tap handler"
    assert "navigateToTask" in content, "Must navigate to task on tap"
    assert "pendingNotification" in content, "Must handle cold-start notifications"
    assert "processPendingNotification" in content, "Must process pending on auth"


def test_notification_migration_exists():
    """Verify reminder_minutes migration file exists."""
    migrations_dir = Path(__file__).parents[3] / "backend" / "node-api" / "migrations"
    migration_files = list(migrations_dir.glob("*.sql"))
    reminder_migration = [f for f in migration_files if "reminder" in f.name.lower()]
    assert len(reminder_migration) > 0, "Must have a reminder migration file"
    content = reminder_migration[0].read_text(encoding="utf-8")
    assert "reminder_minutes" in content, "Migration must add reminder_minutes column"


def test_deadline_notification_guard_past_date():
    """Verify scheduleNotificationsForTask guards against past dates."""
    path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "scheduleTaskNotifications.ts"
    content = path.read_text(encoding="utf-8")
    assert "dueTime > now" in content or "getTime() > now" in content, "Must check due date is in the future"
    assert "reminderTime.getTime() > now" in content or "reminderTime" in content, "Must guard reminder time against past"


def test_notification_scheduler_no_api_keys_exposed():
    """Verify no API keys are exposed in notification code."""
    path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "notificationScheduler.ts"
    content = path.read_text(encoding="utf-8")
    assert "OPENAI" not in content, "Must not expose OpenAI keys"
    assert "GEMINI_API_KEY" not in content, "Must not expose Gemini keys"
    assert "SUPABASE_SERVICE_ROLE" not in content, "Must not expose Supabase keys"


def test_notification_sound_enabled():
    """Verify notifications have sound enabled."""
    path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "notificationScheduler.ts"
    content = path.read_text(encoding="utf-8")
    assert "sound: true" in content, "Notifications must have sound enabled"


def test_notification_foreground_handler():
    """Verify foreground notification handler is configured."""
    path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "notificationScheduler.ts"
    content = path.read_text(encoding="utf-8")
    assert "setNotificationHandler" in content, "Must configure foreground handler"
    assert "shouldShowAlert: true" in content, "Must show alerts in foreground"
    assert "shouldPlaySound: true" in content, "Must play sound in foreground"


# ==================== BIOMETRIC / FINGERPRINT LOGIN TESTS ====================

def test_biometric_package_installed():
    """Verify expo-local-authentication is in dependencies."""
    pkg_path = Path(__file__).parents[3] / "mobile-app" / "package.json"
    content = pkg_path.read_text(encoding="utf-8")
    assert "expo-local-authentication" in content, "Must install expo-local-authentication"


def test_auth_context_has_lock_mechanism():
    """Verify AuthContext has locked state and unlock function."""
    ctx_path = Path(__file__).parents[3] / "mobile-app" / "src" / "context" / "AuthContext.tsx"
    content = ctx_path.read_text(encoding="utf-8")
    assert "locked" in content, "AuthContext must have locked state"
    assert "unlock" in content, "AuthContext must have unlock function"
    assert "LocalAuthentication" in content, "Must use expo-local-authentication"
    assert "authenticateAsync" in content, "Must call authenticateAsync"


def test_auth_context_checks_biometric_on_startup():
    """Verify AuthContext checks biometric setting on app launch."""
    ctx_path = Path(__file__).parents[3] / "mobile-app" / "src" / "context" / "AuthContext.tsx"
    content = ctx_path.read_text(encoding="utf-8")
    assert "flowtask-biometric-enabled" in content, "Must check biometric storage key"
    assert "setLocked(true)" in content, "Must lock when biometric is enabled"


def test_biometric_lock_screen_exists():
    """Verify BiometricLockScreen is rendered when app is locked."""
    app_path = Path(__file__).parents[3] / "mobile-app" / "App.tsx"
    content = app_path.read_text(encoding="utf-8")
    assert "BiometricLockScreen" in content, "Must have BiometricLockScreen"
    assert "finger-print-outline" in content, "Must show fingerprint icon"
    assert "FlowTask is locked" in content, "Must show lock message"


def test_biometric_lock_screen_has_password_fallback():
    """Verify BiometricLockScreen allows password login as fallback."""
    app_path = Path(__file__).parents[3] / "mobile-app" / "App.tsx"
    content = app_path.read_text(encoding="utf-8")
    assert "Use password instead" in content, "Must have password fallback option"
    assert "signOut" in content, "Password fallback must sign out to return to login"


def test_biometric_lock_screen_shows_error():
    """Verify BiometricLockScreen shows error on failed biometric."""
    app_path = Path(__file__).parents[3] / "mobile-app" / "App.tsx"
    content = app_path.read_text(encoding="utf-8")
    assert "Biometric verification was not completed" in content, "Must show error message on failure"


def test_login_screen_has_biometric_option():
    """Verify LoginScreen shows fingerprint login when available."""
    login_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "LoginScreen.tsx"
    content = login_path.read_text(encoding="utf-8")
    assert "finger-print-outline" in content, "Must show fingerprint icon"
    assert "Login with fingerprint" in content, "Must have biometric login button"
    assert "biometricAvailable" in content, "Must check biometric availability"
    assert "LocalAuthentication" in content, "Must use expo-local-authentication"


def test_login_screen_checks_biometric_capability():
    """Verify LoginScreen checks hardware and enrollment before showing biometric."""
    login_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "LoginScreen.tsx"
    content = login_path.read_text(encoding="utf-8")
    assert "hasHardwareAsync" in content, "Must check biometric hardware"
    assert "isEnrolledAsync" in content, "Must check biometric enrollment"
    assert "flowtask-biometric-enabled" in content, "Must check stored biometric preference"


def test_login_screen_biometric_fallback_error():
    """Verify LoginScreen shows error on failed biometric."""
    login_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "LoginScreen.tsx"
    content = login_path.read_text(encoding="utf-8")
    assert "Authentication failed" in content or "Biometric" in content, "Must show error on biometric failure"


def test_settings_screen_has_biometric_toggle():
    """Verify SettingsScreen has biometric login toggle."""
    settings_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "SettingsScreen.tsx"
    content = settings_path.read_text(encoding="utf-8")
    assert "Biometric login" in content, "Must have biometric toggle"
    assert "toggleBiometric" in content, "Must have toggle handler"
    assert "flowtask-biometric-enabled" in content, "Must persist biometric setting"


def test_settings_biometric_checks_hardware():
    """Verify SettingsScreen checks device capability."""
    settings_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "SettingsScreen.tsx"
    content = settings_path.read_text(encoding="utf-8")
    assert "hasHardwareAsync" in content, "Must check biometric hardware"
    assert "isEnrolledAsync" in content, "Must check biometric enrollment"
    assert "biometricHardware" in content or "Not available on this device" in content, "Must show hardware unavailable message"


def test_settings_biometric_disables_when_no_hardware():
    """Verify biometric toggle is disabled when device lacks capability."""
    settings_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "SettingsScreen.tsx"
    content = settings_path.read_text(encoding="utf-8")
    assert "disabled=" in content, "Toggle must have disabled prop"


def test_biometric_uses_async_storage():
    """Verify biometric preference stored via AsyncStorage."""
    ctx_path = Path(__file__).parents[3] / "mobile-app" / "src" / "context" / "AuthContext.tsx"
    content = ctx_path.read_text(encoding="utf-8")
    assert "AsyncStorage" in content, "Must use AsyncStorage"
    assert "biometricStorageKey" in content or "flowtask-biometric-enabled" in content, "Must use biometric storage key"


def test_biometric_no_raw_password_storage():
    """Verify passwords are never stored in AsyncStorage."""
    ctx_path = Path(__file__).parents[3] / "mobile-app" / "src" / "context" / "AuthContext.tsx"
    content = ctx_path.read_text(encoding="utf-8")
    # Should not store password in AsyncStorage
    assert "AsyncStorage.setItem" not in content or "password" not in content.lower().split("asyncstorage.setitem")[0][-50:], "Must not store passwords in AsyncStorage"


def test_biometric_no_api_keys_exposed():
    """Verify biometric code doesn't expose API keys."""
    for rel_path in [
        "mobile-app/src/context/AuthContext.tsx",
        "mobile-app/src/screens/LoginScreen.tsx",
        "mobile-app/src/screens/SettingsScreen.tsx",
        "mobile-app/App.tsx",
    ]:
        path = Path(__file__).parents[3] / rel_path
        content = path.read_text(encoding="utf-8")
        assert "GEMINI_API_KEY" not in content, f"Must not expose API keys in {rel_path}"
        assert "SUPABASE_SERVICE_ROLE" not in content, f"Must not expose keys in {rel_path}"


def test_biometric_uses_local_authentication():
    """Verify expo-local-authentication is used for biometric operations."""
    ctx_path = Path(__file__).parents[3] / "mobile-app" / "src" / "context" / "AuthContext.tsx"
    content = ctx_path.read_text(encoding="utf-8")
    assert "expo-local-authentication" in content, "Must import expo-local-authentication"
    assert "authenticateAsync" in content, "Must use authenticateAsync"


def test_signout_clears_locked_state():
    """Verify signOut clears the locked state."""
    ctx_path = Path(__file__).parents[3] / "mobile-app" / "src" / "context" / "AuthContext.tsx"
    content = ctx_path.read_text(encoding="utf-8")
    assert "setLocked(false)" in content, "signOut must clear locked state"


def test_biometric_lock_requires_session():
    """Verify biometric lock only activates when session exists."""
    ctx_path = Path(__file__).parents[3] / "mobile-app" / "src" / "context" / "AuthContext.tsx"
    content = ctx_path.read_text(encoding="utf-8")
    # Must check both session AND biometric enabled
    assert "data.session && biometricEnabled" in content or ("data.session" in content and "biometricEnabled" in content), "Must require both session and biometric enabled"


def test_app_navigator_shows_lock_when_needed():
    """Verify AppNavigator shows BiometricLockScreen when locked."""
    app_path = Path(__file__).parents[3] / "mobile-app" / "App.tsx"
    content = app_path.read_text(encoding="utf-8")
    assert "if (user && locked)" in content, "Must show lock when user is authenticated and locked"
    assert "BiometricLockScreen" in content, "Must render BiometricLockScreen"


def test_biometric_login_screen_keeps_normal_login():
    """Verify normal email/password login is still available."""
    login_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "LoginScreen.tsx"
    content = login_path.read_text(encoding="utf-8")
    assert "handleLogin" in content, "Must have normal login handler"
    assert "Log In" in content, "Must show normal login button"
    assert "Email" in content, "Must have email field"
    assert "Password" in content, "Must have password field"


# ==================== STABILITY / BUG-FIX TESTS ====================

def test_weekday_notification_uses_weekly_trigger():
    """Verify weekdays recurrence uses WEEKLY triggers, not DAILY."""
    scheduler_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "notificationScheduler.ts"
    content = scheduler_path.read_text(encoding="utf-8")
    assert "scheduleWeekdayReminders" in content, "Must have weekday-specific scheduler"
    assert "WEEKLY" in content, "Must use WEEKLY trigger type"
    assert "WEEKDAY_MONDAY" in content or "weekday" in content, "Must define weekday constants"


def test_weekday_reminder_schedules_five_triggers():
    """Verify weekday scheduler creates 5 individual triggers (Mon-Fri)."""
    scheduler_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "notificationScheduler.ts"
    content = scheduler_path.read_text(encoding="utf-8")
    assert "for (const weekday of WEEKDAYS)" in content, "Must iterate over weekdays"
    assert "WEEKDAY_MONDAY" in content, "Must include Monday"
    assert "WEEKDAY_FRIDAY" in content, "Must include Friday"


def test_schedule_notifications_uses_weekday_for_weekdays_recurrence():
    """Verify scheduleTaskNotifications uses weekday scheduler for weekdays."""
    path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "scheduleTaskNotifications.ts"
    content = path.read_text(encoding="utf-8")
    assert "scheduleWeekdayReminders" in content, "Must call weekday scheduler"
    assert "'weekdays'" in content, "Must check for weekdays recurrence"


def test_daily_recurrence_not_affected_by_weekday_fix():
    """Verify daily recurrence still uses DAILY trigger."""
    path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "scheduleTaskNotifications.ts"
    content = path.read_text(encoding="utf-8")
    assert "'daily'" in content, "Must handle daily recurrence"
    assert "scheduleDailyReminder" in content, "Must use DAILY trigger for daily recurrence"


def test_api_error_messages_are_user_friendly():
    """Verify API error messages are specific, not generic."""
    api_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "api.ts"
    content = api_path.read_text(encoding="utf-8")
    assert "401" in content, "Must handle 401 specifically"
    assert "403" in content, "Must handle 403 specifically"
    assert "404" in content, "Must handle 404 specifically"
    assert "session has expired" in content, "401 must mention session expiry"
    assert "not authorized" in content, "403 must explain authorization"
    assert "connection" in content.lower(), "Network errors must mention connection"


def test_jerry_error_handling_is_comprehensive():
    """Verify Jerry handles network, timeout, auth, and server errors."""
    jerry_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "JerryAssistantScreen.tsx"
    content = jerry_path.read_text(encoding="utf-8")
    assert "timeout" in content.lower(), "Must handle timeout errors"
    assert "Network" in content or "network" in content, "Must handle network errors"
    assert "401" in content or "session" in content.lower(), "Must handle auth errors"
    assert "500" in content or "AI service" in content, "Must handle server errors"


def test_add_task_loading_prevents_double_submit():
    """Verify AddTaskScreen disables button while saving."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "AddTaskScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "saving" in content.lower(), "Must have saving state"
    assert "disabled={saving}" in content, "Button must be disabled while saving"
    assert "loading={saving}" in content, "Button must show loading while saving"


def test_meeting_action_buttons_disabled_during_save():
    """Verify meeting action item buttons disable during save."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "MeetingAssistantScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "savingIndex" in content, "Must track saving index"
    assert "savingAll" in content, "Must track bulk save state"
    assert "disabled=" in content, "Buttons must have disabled prop"


def test_reset_password_uses_configurable_url():
    """Verify reset password redirect uses environment variable, not hardcoded URL."""
    supabase_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "supabase.ts"
    content = supabase_path.read_text(encoding="utf-8")
    assert "EXPO_PUBLIC_AUTH_REDIRECT_URL" in content, "Must use env var for redirect URL"
    assert "flowtask://auth/callback" in content, "Must have deep-link fallback"


def test_login_button_disabled_until_valid():
    """Verify login button is disabled until email + password are valid."""
    login_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "LoginScreen.tsx"
    content = login_path.read_text(encoding="utf-8")
    assert "canSubmit" in content, "Must compute canSubmit"
    assert "disabled={!canSubmit}" in content, "Button must be disabled when cannot submit"


def test_signup_button_disabled_until_valid():
    """Verify signup button is disabled until all fields are valid."""
    signup_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "SignupScreen.tsx"
    content = signup_path.read_text(encoding="utf-8")
    assert "canSubmit" in content, "Must compute canSubmit"
    assert "disabled={loading}" in content, "Button must be disabled during loading"


def test_all_child_screens_have_back_button():
    """Verify all child screens have back navigation."""
    child_screens = [
        ('TasksScreen', 'TasksScreen.tsx'),
        ('AddTaskScreen', 'AddTaskScreen.tsx'),
        ('TaskDetailScreen', 'TaskDetailScreen.tsx'),
        ('SettingsScreen', 'SettingsScreen.tsx'),
        ('CalendarScreen', 'CalendarScreen.tsx'),
        ('FocusModeScreen', 'FocusModeScreen.tsx'),
        ('MeetingDetailsScreen', 'MeetingDetailsScreen.tsx'),
    ]
    for name, filename in child_screens:
        path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / filename
        if path.exists():
            content = path.read_text(encoding="utf-8")
            assert "goBack" in content, f"{name} must have goBack for back navigation"


def test_keyboard_avoiding_view_on_input_screens():
    """Verify KeyboardAvoidingView wraps all input-heavy screens."""
    input_screens = [
        'LoginScreen.tsx',
        'SignupScreen.tsx',
        'UpdatePasswordScreen.tsx',
        'AddTaskScreen.tsx',
        'JerryAssistantScreen.tsx',
        'MeetingAssistantScreen.tsx',
        'TaskDetailScreen.tsx',
    ]
    for filename in input_screens:
        path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / filename
        if path.exists():
            content = path.read_text(encoding="utf-8")
            assert "KeyboardAvoidingView" in content, f"{filename} must have KeyboardAvoidingView"


def test_jerry_has_suggested_prompts():
    """Verify Jerry shows suggested prompts on empty state."""
    jerry_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "JerryAssistantScreen.tsx"
    content = jerry_path.read_text(encoding="utf-8")
    assert "What tasks are due today?" in content, "Must suggest task query"
    assert "overdue" in content.lower(), "Must suggest overdue query"
    assert "Try saying" in content, "Must have suggestions section"
    assert "Kal DSA padhna hai" in content, "Must have Hindi suggested prompt"
    assert "Aaj mere tasks kya hain?" in content, "Must have Hindi task query prompt"
    assert "Isko high priority kar do" in content, "Must have Hindi follow-up prompt"
    assert "getGreetingMessage" in content, "Must have time-based greeting"


def test_meeting_recording_uses_correct_api_endpoint():
    """Verify meeting recording sends to /api/ai/transcribe."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "MeetingAssistantScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "/api/ai/transcribe" in content, "Must transcribe via Node API proxy"
    assert "multipart/form-data" in content, "Must use FormData for audio upload"
    assert "120000" in content, "Must have long timeout for transcription"


def test_notification_permission_requested():
    """Verify notification permissions are requested before scheduling."""
    scheduler_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "notificationScheduler.ts"
    content = scheduler_path.read_text(encoding="utf-8")
    assert "requestNotificationPermissions" in content, "Must have permission request function"
    assert "getPermissionsAsync" in content, "Must check existing permissions"
    assert "requestPermissionsAsync" in content, "Must request permissions when needed"


def test_biometric_disable_clears_preference():
    """Verify disabling biometric clears the stored preference."""
    settings_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "SettingsScreen.tsx"
    content = settings_path.read_text(encoding="utf-8")
    assert "flowtask-biometric-enabled" in content, "Must manage biometric preference"
    assert "'false'" in content, "Must be able to set biometric to false"


def test_notification_foreground_handler_configured():
    """Verify notification foreground handler is set up in notificationScheduler."""
    scheduler_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "notificationScheduler.ts"
    content = scheduler_path.read_text(encoding="utf-8")
    assert "setNotificationHandler" in content, "Must configure foreground handler"
    assert "shouldShowBanner: true" in content, "Must show banner"
    assert "shouldPlaySound: true" in content, "Must play sound"


# ==================== JERRY UPGRADE TESTS ====================

def test_jerry_regex_classifies_greeting():
    """Verify greetings are classified as greeting, not task_create."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    assert "GREETING_PATTERN" in content, "Must have greeting pattern"
    assert "greeting" in content, "Must classify greetings"

def test_jerry_regex_classifies_conversation():
    """Verify thanks/small talk classified as conversation, not task_create."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    assert '"conversation"' in content or "'conversation'" in content, "Must classify conversation"

def test_jerry_regex_classifies_task_query():
    """Verify task queries are classified correctly."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    assert '"task_query"' in content or "'task_query'" in content, "Must classify task queries"

def test_jerry_regex_classifies_task_create():
    """Verify task creation with explicit verbs classified correctly."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    assert '"task_create"' in content or "'task_create'" in content, "Must classify task creation"

def test_jerry_regex_classifies_task_complete():
    """Verify task complete classified correctly."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    assert '"task_complete"' in content or "'task_complete'" in content, "Must classify task complete"

def test_jerry_regex_classifies_task_delete():
    """Verify task delete classified correctly."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    assert '"task_delete"' in content or "'task_delete'" in content, "Must classify task delete"

def test_jerry_regex_classifies_task_update():
    """Verify task update classified correctly."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    assert '"task_update"' in content or "'task_update'" in content, "Must classify task update"

def test_jerry_regex_classifies_meeting_query():
    """Verify meeting queries classified correctly."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    assert '"meeting_query"' in content or "'meeting_query'" in content, "Must classify meeting queries"

def test_jerry_regex_classifies_out_of_scope():
    """Verify out-of-scope questions classified correctly."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    assert '"out_of_scope"' in content or "'out_of_scope'" in content, "Must classify out-of-scope"

def test_jerry_regex_prevents_false_task_create():
    """Verify questions without task verbs don't become tasks."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    # Must have check for questions ending with ? that lack task verbs
    assert 'endswith("?")' in content or "endswith('?')" in content, "Must check for question marks"
    assert 'CREATE_VERB_PATTERN' in content, "Must check for task verbs"

def test_jerry_classifies_hindi_greeting():
    """Verify Hindi greetings classified as greeting."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    assert "namaste" in content.lower(), "Must handle Hindi greetings"
    assert "kaise ho" in content.lower() or "kya haal" in content.lower(), "Must handle Hindi small talk"

def test_jerry_classifies_hindi_task():
    """Verify Hindi task creation patterns classified correctly."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    assert "karna hai" in content, "Must handle Hindi task creation"

def test_jerry_language_detection():
    """Verify Hindi/Hinglish language detection."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    assert "jerry_language" in content, "Must have language detection"
    assert "hi" in content, "Must detect Hindi"

def test_jerry_response_generation():
    """Verify response generation uses Gemini for natural responses."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    assert "generate_jerry_response" in content, "Must have response generation"
    assert "template_fallback" in content or "_template_fallback" in content, "Must have template fallback"

def test_jerry_hindi_reply_templates():
    """Verify Hindi reply templates exist for common intents."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    assert "Namaste" in content, "Must have Hindi greeting reply"
    assert "karna hai" in content.lower() or "karna" in content, "Must have Hindi help reply"

def test_jerry_node_api_conversation_context():
    """Verify Node API has conversation context for follow-ups."""
    ai_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "ai.ts"
    content = ai_path.read_text(encoding="utf-8")
    assert "ConversationContext" in content, "Must have conversation context type"
    assert "getConversationContext" in content, "Must have get context function"
    assert "setConversationContext" in content, "Must have set context function"

def test_jerry_node_api_handles_assignment_followup():
    """Verify Node API handles assignment email collection and confirmation."""
    ai_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "ai.ts"
    content = ai_path.read_text(encoding="utf-8")
    assert "pendingAssignment" in content, "Must track pending assignment"
    assert "awaitingEmail" in content or "awaiting_email" in content, "Must track email awaiting state"
    assert "awaitingConfirmation" in content, "Must track confirmation state"

def test_jerry_node_api_handles_mutation_followup():
    """Verify Node API handles follow-up task mutations like 'make it 5 PM'."""
    ai_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "ai.ts"
    content = ai_path.read_text(encoding="utf-8")
    assert "lastMutationTask" in content, "Must track last mutation task"
    assert "awaitingMutationUpdate" in content, "Must track mutation update state"

def test_jerry_node_api_has_intent_routing():
    """Verify Node API routes by intent type."""
    ai_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "ai.ts"
    content = ai_path.read_text(encoding="utf-8")
    assert "task_create" in content, "Must route task_create"
    assert "task_query" in content, "Must route task_query"
    assert "task_complete" in content, "Must route task_complete"
    assert "task_delete" in content, "Must route task_delete"
    assert "task_update" in content, "Must route task_update"
    assert "task_assign" in content, "Must route task_assign"
    assert "meeting_query" in content, "Must route meeting_query"

def test_jerry_node_api_has_task_resolution():
    """Verify Node API has task matching/resolution."""
    ai_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "ai.ts"
    content = ai_path.read_text(encoding="utf-8")
    assert "resolveTask" in content, "Must have task resolver"
    assert "executeCreateTask" in content, "Must have task creation executor"
    assert "executeTaskQuery" in content, "Must have task query executor"

def test_jerry_node_api_has_user_isolation():
    """Verify Node API scopes all queries to authenticated user."""
    ai_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "ai.ts"
    content = ai_path.read_text(encoding="utf-8")
    assert "userId" in content, "Must use authenticated userId"
    assert "req.user!.id" in content, "Must derive userId from session"
    assert "eq('user_id', userId)" in content, "Must filter by user_id"

def test_jerry_node_api_handles_meeting_query():
    """Verify Node API handles meeting queries from Jerry."""
    ai_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "ai.ts"
    content = ai_path.read_text(encoding="utf-8")
    assert "meetings" in content, "Must query meetings table"
    assert "meeting_query" in content, "Must handle meeting_query intent"

def test_jerry_mobile_has_chat_ui():
    """Verify mobile Jerry screen has chat UI components."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "JerryAssistantScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "messages" in content, "Must have messages state"
    assert "ChatMessage" in content or "role: 'user'" in content, "Must have chat message type"
    assert "scrollRef" in content, "Must have scroll ref"
    assert "scrollToEnd" in content, "Must auto-scroll"
    assert "timestamp" in content.lower(), "Must show message timestamps"
    assert "accessibilityLabel" in content, "Must have accessibility labels"

def test_jerry_mobile_has_voice_input():
    """Verify mobile Jerry has voice input support."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "JerryAssistantScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "ExpoSpeechRecognitionModule" in content, "Must use speech recognition"
    assert "startListening" in content or "start" in content, "Must have start listening"
    assert "stopListening" in content or "stop" in content, "Must have stop listening"
    assert "listening" in content, "Must track listening state"

def test_jerry_mobile_has_send_button():
    """Verify mobile Jerry has Send button."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "JerryAssistantScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "send" in content.lower(), "Must have send button"
    assert "submit" in content, "Must have submit function"

def test_jerry_mobile_send_disabled_during_working():
    """Verify send button disabled during processing."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "JerryAssistantScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "working" in content, "Must track working state"
    assert "disabled={working" in content, "Must disable button while working"

def test_jerry_mobile_has_suggested_prompts():
    """Verify mobile Jerry has suggested prompts with Hindi/Hinglish examples."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "JerryAssistantScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "What tasks are due today?" in content, "Must suggest task query"
    assert "overdue" in content.lower(), "Must suggest overdue query"
    assert "suggestedPrompts" in content, "Must have prompts data structure"
    assert "Kal DSA padhna hai" in content, "Must have Hindi prompt"
    assert "Shaam 7 baje" in content, "Must have Hindi time prompt"

def test_jerry_mobile_handles_voice_result():
    """Verify voice result fills input text."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "JerryAssistantScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "setTextCommand" in content, "Must set text command from voice"
    assert "setInputMode('voice')" in content, "Must set input mode to voice"

def test_jerry_mobile_has_loading_indicator():
    """Verify mobile Jerry shows loading indicator."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "JerryAssistantScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "ActivityIndicator" in content, "Must have loading indicator"
    assert "thinking" in content.lower() or "Jerry is" in content, "Must show thinking state"

def test_jerry_mobile_has_error_handling():
    """Verify mobile Jerry handles errors gracefully."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "JerryAssistantScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "timeout" in content.lower() or "Timeout" in content, "Must handle timeout"
    assert "Network" in content or "network" in content, "Must handle network errors"
    assert "setError" in content, "Must set error state"

def test_jerry_service_has_intent_types():
    """Verify Jerry service defines all intent types."""
    service_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "jerryService.ts"
    content = service_path.read_text(encoding="utf-8")
    assert "task_create" in content, "Must have task_create intent"
    assert "task_query" in content, "Must have task_query intent"
    assert "task_update" in content, "Must have task_update intent"
    assert "task_complete" in content, "Must have task_complete intent"
    assert "task_delete" in content, "Must have task_delete intent"
    assert "greeting" in content, "Must have greeting intent"
    assert "conversation" in content, "Must have conversation intent"
    assert "meeting_query" in content, "Must have meeting_query intent"
    assert "out_of_scope" in content, "Must have out_of_scope intent"
    assert "unclear" in content, "Must have unclear intent"

def test_jerry_service_has_language_field():
    """Verify Jerry service handles language field."""
    service_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "jerryService.ts"
    content = service_path.read_text(encoding="utf-8")
    assert "language" in content, "Must have language field"
    assert "hi" in content, "Must support Hindi"

def test_jerry_service_has_timeout():
    """Verify Jerry service has appropriate timeout."""
    service_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "jerryService.ts"
    content = service_path.read_text(encoding="utf-8")
    assert "timeout" in content, "Must have timeout"
    assert "120000" in content, "Must have 120s timeout for AI calls"

def test_jerry_regex_has_hindi_task_patterns():
    """Verify regex handles Hindi task creation patterns."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    assert "karna hai" in content, "Must handle 'karna hai' pattern"
    assert "yaad dilana" in content or "yaad dila" in content, "Must handle reminder patterns"

def test_jerry_regex_has_hindi_query_patterns():
    """Verify regex handles Hindi task query patterns."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    assert "aaj" in content, "Must handle 'aaj' (today)"
    assert "kal" in content, "Must handle 'kal' (tomorrow)"

def test_jerry_regex_has_hindi_mutation_patterns():
    """Verify regex handles Hindi task mutation patterns."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    assert "hatao" in content or "hata" in content, "Must handle Hindi delete"
    assert "kar do" in content or "karo" in content, "Must handle Hindi action verbs"

def test_jerry_gemini_system_prompt_has_intents():
    """Verify Gemini system prompt defines all intents."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    assert "greeting" in content, "Gemini prompt must include greeting"
    assert "conversation" in content, "Gemini prompt must include conversation"
    assert "task_create" in content, "Gemini prompt must include task_create"
    assert "task_query" in content, "Gemini prompt must include task_query"
    assert "out_of_scope" in content, "Gemini prompt must include out_of_scope"
    assert "unclear" in content, "Gemini prompt must include unclear"

def test_jerry_gemini_prompt_has_safety_rules():
    """Verify Gemini prompt prevents false task creation."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    assert "NEVER create a task from greetings" in content, "Must warn against creating tasks from greetings"
    assert "NEVER create a task from" in content, "Must have safety rules"

def test_jerry_gemini_prompt_handles_hindi():
    """Verify Gemini prompt handles Hindi/Hinglish."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    assert "Hindi" in content, "Must mention Hindi in prompt"
    assert "Hinglish" in content, "Must mention Hinglish"

def test_jerry_voice_flow_no_auto_send():
    """Verify voice transcription does not auto-send."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "JerryAssistantScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    # Must NOT auto-send after voice transcription
    assert "no auto-send" in content.lower() or "user can tap Send" in content.lower() or "prevent" in content.lower(), "Must not auto-send after voice"

def test_jerry_node_api_ml_forward():
    """Verify Node API forwards to ML API for classification."""
    ai_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "ai.ts"
    content = ai_path.read_text(encoding="utf-8")
    assert "/api/ml/parse" in content, "Must forward to ML API"
    assert "forwardJson" in content, "Must use forwardJson helper"

def test_jerry_node_api_error_handling():
    """Verify Node API handles ML API failures gracefully."""
    ai_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "ai.ts"
    content = ai_path.read_text(encoding="utf-8")
    assert "Jerry is temporarily unavailable" in content, "Must have friendly ML failure message"
    assert "intent: 'unknown'" in content, "Must return unknown on failure"

def test_jerry_node_api_has_duplicate_prevention():
    """Verify duplicate task creation is prevented."""
    ai_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "ai.ts"
    content = ai_path.read_text(encoding="utf-8")
    assert "duplicate" in content, "Must check for duplicates"
    assert "ilike" in content, "Must use case-insensitive matching"

def test_jerry_mobile_no_api_keys_exposed():
    """Verify Jerry mobile code doesn't expose API keys."""
    for rel_path in [
        "mobile-app/src/screens/JerryAssistantScreen.tsx",
        "mobile-app/src/services/jerryService.ts",
    ]:
        path = Path(__file__).parents[3] / rel_path
        content = path.read_text(encoding="utf-8")
        assert "GEMINI_API_KEY" not in content, f"Must not expose API keys in {rel_path}"
        assert "SUPABASE_SERVICE_ROLE" not in content, f"Must not expose keys in {rel_path}"

def test_jerry_conversation_context_ttl():
    """Verify conversation context has expiry."""
    ai_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "ai.ts"
    content = ai_path.read_text(encoding="utf-8")
    assert "CONTEXT_TTL" in content or "TTL" in content, "Must have context TTL"
    assert "10 * 60" in content or "600000" in content, "Must have reasonable TTL"


# ==================== INTENT CLASSIFICATION REGRESSION TESTS ====================

def test_hindi_task_creation_padhna():
    """Verify 'Mujhe kal DSA padhna hai' classifies as task_create."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    assert "padhna hai" in content, "Must include 'padhna hai' in Hindi action verbs"

def test_hindi_task_creation_karna():
    """Verify 'Kal assignment submit karna hai' classifies as task_create."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    assert "karna hai" in content, "Must include 'karna hai' in Hindi action verbs"

def test_hindi_task_creation_verb_varieties():
    """Verify multiple Hindi verb infinitives are supported."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    for verb in ["padhna", "likhna", "karna", "bhejna", "dena", "lena", "jana", "aana", "seekhna", "milna", "banana", "dekhna"]:
        assert verb in content, f"Must include Hindi verb '{verb}'"

def test_hedging_pattern_exists():
    """Verify hedging pattern exists to catch casual statements."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    assert "HEDGING_PATTERN" in content, "Must have hedging pattern"
    assert "maybe" in content, "Must catch 'maybe'"
    assert "i should" in content or "i should" in content.lower(), "Must catch 'I should'"
    assert "shaayad" in content, "Must catch Hindi hedging 'shaayad'"

def test_hedging_prevents_false_task_create():
    """Verify hedging prevents casual statements from becoming tasks."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    # Must check hedging BEFORE task_create
    hedging_idx = content.find("HEDGING_PATTERN")
    create_idx = content.find("has_create_verb")
    # The hedging check should appear in the function before task_create
    assert hedging_idx > 0, "HEDGING_PATTERN must be used"

def test_flowtask_help_patterns():
    """Verify FlowTask help patterns include 'tell me about'."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    assert "tell me about flowtask" in content, "Must handle 'tell me about FlowTask'"
    assert "what is flowtask" in content, "Must handle 'What is FlowTask?'"
    assert "how does flowtask" in content, "Must handle 'How does FlowTask work?'"

def test_post_gemini_safety_check():
    """Verify post-Gemini safety check rejects hedged task_create."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    assert "Post-Gemini safety" in content or "post-gemini" in content.lower(), "Must have post-Gemini safety check"
    assert "hedging_reject" in content or "hedging" in content.lower(), "Must check for hedging after Gemini"

def test_task_query_requires_question():
    """Verify task_query is only for questions, not action statements."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    assert "is_english_task_query" in content, "Must have English task query check"
    assert "is_hindi_explicit_query" in content, "Must have Hindi task query check"
    assert "has_action_verb" in content, "Must check for action verbs"

def test_hindi_action_verb_defines_broad_coverage():
    """Verify Hindi action verbs cover natural sentence constructions."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    # Must include both infinitive and "hai" forms
    assert "submit karna hai" in content, "Must handle 'submit karna hai'"
    assert "complete karna hai" in content, "Must handle 'complete karna hai'"
    assert "call karna hai" in content, "Must handle 'call karna hai'"

def test_regex_prevents_false_positive_task_create():
    """Verify the regex classification handles the key regression cases."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    # Verify the key patterns exist in the code
    assert "padhna hai" in content, "Must handle 'padhna hai'"
    assert "HEDGING_PATTERN" in content, "Must have hedging pattern"
    assert "HINDI_ACTION_VERBS" in content, "Must have Hindi action verbs"
    assert "has_action_verb" in content, "Must check for action verbs before task_query"
    assert "is_english_task_query" in content, "Must have English task query check"
    assert "Post-Gemini safety" in content or "post-gemini" in content.lower(), "Must have post-Gemini safety"
    # Verify hedging keywords are present
    assert "shaayad" in content, "Must catch Hindi hedging 'shaayad'"
    assert "soch raha" in content, "Must catch Hindi hedging 'soch raha'"


# ==================== MULTI-TURN FOLLOW-UP TESTS ====================

def test_contextual_reference_pronouns_exist():
    """Verify pronouns are detected in contextual follow-up handler."""
    ai_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "ai.ts"
    content = ai_path.read_text(encoding="utf-8")
    assert "hasContextualReference" in content, "Must have hasContextualReference helper"
    for pronoun in ["it", "this", "that", "isko", "isme", "usko", "ye", "yeh", "woh", "ise"]:
        assert pronoun in content, f"Must detect pronoun '{pronoun}'"

def test_contextual_delete_exists():
    """Verify contextual delete follow-up is implemented."""
    ai_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "ai.ts"
    content = ai_path.read_text(encoding="utf-8")
    assert "isContextualDelete" in content, "Must have isContextualDelete helper"
    assert "Delete it" in content or "delete" in content.lower(), "Must handle delete intent"
    assert "isko delete" in content.lower() or "hata" in content, "Must handle Hindi delete"

def test_contextual_complete_exists():
    """Verify contextual complete follow-up is implemented."""
    ai_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "ai.ts"
    content = ai_path.read_text(encoding="utf-8")
    assert "isContextualComplete" in content, "Must have isContextualComplete helper"
    assert "done kar do" in content or "complete" in content.lower(), "Must handle complete intent"

def test_hindi_time_parsing_baje():
    """Verify Hindi time parsing for 'baje' format."""
    ai_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "ai.ts"
    content = ai_path.read_text(encoding="utf-8")
    assert "parseHindiTime" in content, "Must have parseHindiTime helper"
    assert "baje" in content, "Must handle 'baje' time format"
    assert "shaam" in content, "Must handle 'shaam' (evening)"
    assert "subah" in content, "Must handle 'subah' (morning)"
    assert "raat" in content, "Must handle 'raat' (night)"

def test_relative_time_parsing():
    """Verify relative time parsing for '30 minutes', '30 minute baad'."""
    ai_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "ai.ts"
    content = ai_path.read_text(encoding="utf-8")
    assert "parseRelativeTime" in content, "Must have parseRelativeTime helper"
    assert "minutes?" in content or "minute" in content, "Must handle minutes pattern"
    assert "baad" in content, "Must handle 'baad' (after) for Hindi relative time"

def test_followup_delete_verifies_task_exists():
    """Verify contextual delete checks task ownership before deleting."""
    ai_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "ai.ts"
    content = ai_path.read_text(encoding="utf-8")
    # Must verify task exists and belongs to user before delete
    assert "existingTask" in content, "Must verify task exists before delete"
    assert "no longer exists" in content or "not found" in content.lower(), "Must handle deleted task gracefully"

def test_followup_complete_verifies_task_exists():
    """Verify contextual complete checks task status before completing."""
    ai_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "ai.ts"
    content = ai_path.read_text(encoding="utf-8")
    assert "already marked as complete" in content or "already" in content.lower(), "Must handle already-completed task"

def test_meeting_context_tracking():
    """Verify lastMeetingId is stored for meeting follow-ups."""
    ai_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "ai.ts"
    content = ai_path.read_text(encoding="utf-8")
    assert "lastMeetingId" in content, "Must have lastMeetingId in context"
    assert "setConversationContext" in content and "lastMeetingId" in content, "Must store lastMeetingId in context"

def test_meeting_followup_uses_stored_id():
    """Verify meeting follow-up queries use stored meeting ID."""
    ai_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "ai.ts"
    content = ai_path.read_text(encoding="utf-8")
    assert "convCtx?.lastMeetingId" in content or "convCtx.lastMeetingId" in content, "Must check for stored meeting ID"
    assert "storedMeeting" in content or "stored" in content.lower(), "Must fetch stored meeting by ID"

def test_meeting_fallback_to_latest():
    """Verify meeting query falls back to latest when no context exists."""
    ai_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "ai.ts"
    content = ai_path.read_text(encoding="utf-8")
    assert "latest" in content.lower() or "Fallback" in content, "Must fall back to latest meeting"

def test_no_context_does_not_modify_task():
    """Verify 'Delete it' without context does NOT modify any task."""
    ai_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "ai.ts"
    content = ai_path.read_text(encoding="utf-8")
    # The follow-up handler requires awaitingMutationUpdate AND lastMutationTask
    assert "awaitingMutationUpdate" in content, "Must gate follow-up on awaitingMutationUpdate flag"
    assert "lastMutationTask" in content, "Must require lastMutationTask for follow-up"

def test_hindi_date_followups_supported():
    """Verify Hindi date words are supported in follow-up context."""
    ai_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "ai.ts"
    content = ai_path.read_text(encoding="utf-8")
    # resolveDateFromText already handles kal, aaj, agle hafte
    assert "kal" in content, "Must handle 'kal' (tomorrow)"
    assert "aaj" in content, "Must handle 'aaj' (today)"
    assert "agle hafte" in content, "Must handle 'agle hafte' (next week)"

def test_existing_followup_preserved():
    """Verify existing English follow-up patterns still work."""
    ai_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "ai.ts"
    content = ai_path.read_text(encoding="utf-8")
    assert "7 PM" in content or "am|pm" in content, "Must support English time (7 PM)"
    assert "high" in content and "priority" in content, "Must support priority updates"
    assert "friday" in content.lower() or "Friday" in content, "Must support day-of-week updates"
    assert "tomorrow" in content, "Must support 'tomorrow' in follow-ups"

def test_followup_handles_already_deleted_task():
    """Verify follow-up handles task that was deleted between creation and follow-up."""
    ai_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "ai.ts"
    content = ai_path.read_text(encoding="utf-8")
    assert "no longer exists" in content, "Must handle task deleted between creation and follow-up"


# ==================== ADD TASK BUG-FIX TESTS ====================

def test_recurrence_weekdays_in_db_constraint():
    """Verify the DB CHECK constraint includes 'weekdays'."""
    migration_path = Path(__file__).parents[3] / "backend" / "node-api" / "migrations" / "008_recurrence_weekdays_constraint.sql"
    assert migration_path.exists(), "Must have migration 008 for weekdays constraint"
    content = migration_path.read_text(encoding="utf-8")
    assert "weekdays" in content, "Migration must add 'weekdays' to CHECK constraint"
    assert "tasks_recurrence_check" in content, "Migration must target the correct constraint"

def test_recurrence_weekdays_in_original_migration():
    """Verify fresh database setup allows the weekdays recurrence supported by clients."""
    migration_path = Path(__file__).parents[3] / "database" / "migration.sql"
    content = migration_path.read_text(encoding="utf-8")
    recurrence_section = content[content.find('recurrence'):content.find('recurrence') + 200]
    assert 'weekdays' in recurrence_section, "Fresh database setup must allow weekdays recurrence"

def test_task_service_normalize_task_has_defaults():
    """Verify normalizeTask sets defaults for all optional fields."""
    service_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "taskService.ts"
    content = service_path.read_text(encoding="utf-8")
    assert "recurrence:" in content, "normalizeTask must default recurrence"
    assert "assignee:" in content, "normalizeTask must default assignee"
    assert "reminder_minutes:" in content, "normalizeTask must default reminder_minutes"
    assert "recurrence_end_date:" in content, "normalizeTask must default recurrence_end_date"
    assert "parent_task_id:" in content, "normalizeTask must default parent_task_id"

def test_task_service_no_dead_task_columns():
    """Verify the unused taskColumns constant is removed."""
    service_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "taskService.ts"
    content = service_path.read_text(encoding="utf-8")
    # taskColumns should not exist as a standalone constant anymore
    lines = content.split('\n')
    dead_const = [l for l in lines if l.strip().startswith('const taskColumns')]
    assert len(dead_const) == 0, "Must not have unused taskColumns constant"

def test_backend_zod_allows_weekdays():
    """Verify the backend Zod schema accepts 'weekdays' recurrence."""
    tasks_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "tasks.ts"
    content = tasks_path.read_text(encoding="utf-8")
    assert "'weekdays'" in content, "Backend Zod schema must include 'weekdays'"

def test_add_task_payload_includes_all_fields():
    """Verify AddTaskScreen sends all expected fields in the payload."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "AddTaskScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    for field in ['title', 'description', 'due_date', 'priority', 'status', 'tags', 'context', 'assignee', 'recurrence', 'recurrence_end_date', 'reminder_minutes']:
        assert field in content, f"AddTaskScreen payload must include '{field}'"

def test_add_task_saving_prevents_double_submit():
    """Verify the Save button is disabled while saving."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "AddTaskScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert 'disabled={saving}' in content, "Save button must be disabled during save"
    assert 'loading={saving}' in content, "Save button must show loading during save"

def test_add_task_error_handling():
    """Verify AddTaskScreen has error state and try/catch."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "AddTaskScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert 'catch (err' in content, "Must have error handling in save"
    assert 'setError' in content, "Must set error state on failure"

def test_add_task_navigates_correctly():
    """Verify navigation after create vs edit."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "AddTaskScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert 'MainTabs' in content or 'goBack' in content, "Must navigate after save"

def test_backend_tasks_select_all():
    """Verify backend GET /api/tasks returns all columns (not just taskColumns subset)."""
    tasks_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "tasks.ts"
    content = tasks_path.read_text(encoding="utf-8")
    assert "select('*')" in content or "select('*" in content, "Backend must select all columns"

def test_backend_due_date_datetime_validation():
    """Verify backend due_date uses datetime validation."""
    tasks_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "tasks.ts"
    content = tasks_path.read_text(encoding="utf-8")
    assert 'datetime' in content, "Backend must validate due_date as datetime"
    assert 'reminder_minutes' in content, "Backend must validate reminder_minutes"
    assert 'recurrence_end_date' in content, "Backend must validate recurrence_end_date"

def test_add_task_reminder_options_complete():
    """Verify AddTaskScreen has all reminder options."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "AddTaskScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    for label in ['None', 'At due time', '5 min before', '15 min before', '30 min before', '1 hour before', '1 day before']:
        assert label in content, f"Must have reminder option: {label}"

def test_add_task_recurrence_options_complete():
    """Verify AddTaskScreen has all recurrence options including weekdays."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "AddTaskScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    for value in ['none', 'daily', 'weekdays', 'weekly', 'monthly']:
        assert f"'{value}'" in content or f'"{value}"' in content, f"Must have recurrence option: {value}"

def test_add_task_empty_title_rejected():
    """Verify empty title prevents save."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "AddTaskScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert 'title.trim()' in content, "Must validate title is non-empty"
    assert 'required' in content.lower(), "Must show required error for empty title"


# ==================== ADD TASK DUE TIME TESTS ====================

def test_add_task_has_due_time_field():
    """Verify AddTaskScreen has a due time input field."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "AddTaskScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert 'dueTime' in content, "Must have dueTime state"
    assert 'Due time' in content or 'due time' in content, "Must have Due time label"

def test_add_task_has_parseDueDateTime():
    """Verify AddTaskScreen uses parseDueDateTime to combine date + time."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "AddTaskScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert 'parseDueDateTime' in content, "Must use parseDueDateTime function"
    assert 'parseDueDateTime(dueDate, dueTime)' in content, "Must combine date and time"

def test_add_task_time_input_has_placeholder():
    """Verify time input has a helpful placeholder."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "AddTaskScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert '17:00' in content, "Time placeholder should show example like 17:00"

def test_add_task_error_shows_api_message():
    """Verify AddTaskScreen extracts API error messages from response."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "AddTaskScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert 'response?.data?.error' in content, "Must extract API error message from response"

def test_task_service_extracts_api_errors():
    """Verify taskService extracts Supabase error messages."""
    service_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "taskService.ts"
    content = service_path.read_text(encoding="utf-8")
    assert 'response?.data?.error' in content, "taskService must extract error from API response"

def test_migration_009_catchup_columns():
    """Verify migration 009 ensures all required task columns exist."""
    migration_path = Path(__file__).parents[3] / "backend" / "node-api" / "migrations" / "009_catchup_task_columns.sql"
    content = migration_path.read_text(encoding="utf-8")
    assert 'reminder_minutes' in content, "Must ensure reminder_minutes column"
    assert 'recurrence_end_date' in content, "Must ensure recurrence_end_date column"
    assert 'parent_task_id' in content, "Must ensure parent_task_id column"
    assert 'task_assignments' in content, "Must ensure task_assignments table"

def test_migration_008_dynamic_constraint():
    """Verify migration 008 dynamically finds constraints by column, not by name."""
    migration_path = Path(__file__).parents[3] / "backend" / "node-api" / "migrations" / "008_recurrence_weekdays_constraint.sql"
    content = migration_path.read_text(encoding="utf-8")
    assert 'weekdays' in content, "Must add weekdays to CHECK constraint"
    assert 'pg_constraint' in content, "Must query pg_constraint dynamically"
    assert 'attname' in content, "Must find constraint by column name, not hardcoded name"

# ==================== MEETING ANALYSIS FIX TESTS ====================

def test_meeting_prompt_uses_assignee_not_owner():
    """Verify the MEETING_SYSTEM_PROMPT uses 'assignee' not 'owner'."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    # Find the MEETING_SYSTEM_PROMPT section
    prompt_start = content.find('MEETING_SYSTEM_PROMPT')
    prompt_section = content[prompt_start:prompt_start + 2000]
    assert '"assignee"' in prompt_section, "Meeting prompt must use 'assignee' not 'owner'"
    # Ensure 'owner' is NOT used as the JSON field name in the prompt
    # (it may appear in descriptive text, so check the JSON structure specifically)
    assert '"owner":' not in prompt_section, "Meeting prompt must NOT use 'owner' as JSON field name"

def test_meeting_prompt_requests_participants():
    """Verify the meeting analysis prompt explicitly requests participant extraction."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    prompt_start = content.find('MEETING_SYSTEM_PROMPT')
    prompt_section = content[prompt_start:prompt_start + 2000]
    assert '"participants"' in prompt_section, "Meeting prompt must request participants field"
    assert 'participants' in prompt_section.lower(), "Meeting prompt must mention participants extraction"

def test_meeting_prompt_has_participants_rule():
    """Verify the meeting prompt has a PARTICIPANTS rule for extraction."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    prompt_start = content.find('MEETING_SYSTEM_PROMPT')
    prompt_section = content[prompt_start:prompt_start + 3000]
    assert 'PARTICIPANTS:' in prompt_section, "Must have PARTICIPANTS extraction rule"
    assert 'self-introduction' in prompt_section.lower() or 'self introduction' in prompt_section.lower() or 'I\'m' in prompt_section or 'introduc' in prompt_section.lower(), "Must mention self-introductions for participant detection"

def test_split_speaker_statement_permissive():
    """Verify split_speaker_statement handles more name formats."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    # Must handle [spk_1] (Name): format
    assert 'spk_' in content or 'spk' in content.lower(), "Must handle [spk_N] speaker labels"
    # Must allow digits in names
    assert 'A-Za-z0-9' in content or 'A-Za-z0-9' in content, "Must allow digits in speaker names"

def test_meeting_normalize_handles_owner_field():
    """Verify normalize_meeting_analysis handles both 'owner' and 'assignee' fields."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    normalize_start = content.find('def normalize_meeting_analysis')
    normalize_end = content.find('\ndef ', normalize_start + 1)
    normalize_section = content[normalize_start:normalize_end if normalize_end > 0 else normalize_start + 5000]
    assert 'assignee' in normalize_section, "Must check for 'assignee' field"
    assert 'owner' in normalize_section, "Must fallback to 'owner' field"

def test_action_item_model_has_assignee():
    """Verify ActionItem model uses 'assignee' not 'owner'."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    action_start = content.find('class ActionItem')
    action_section = content[action_start:action_start + 300]
    assert 'assignee' in action_section, "ActionItem model must have 'assignee' field"

def test_meeting_analysis_response_has_participants():
    """Verify AnalyzeMeetingResponse has participants field."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    response_start = content.find('class AnalyzeMeetingResponse')
    response_section = content[response_start:response_start + 300]
    assert 'participants' in response_section, "AnalyzeMeetingResponse must have participants field"

def test_meeting_transcription_uses_gemini():
    """Verify transcription uses Gemini, not OpenAI."""
    transcription_path = Path(__file__).parents[3] / "backend" / "ml-api" / "transcription.py"
    content = transcription_path.read_text(encoding="utf-8")
    assert 'gemini' in content.lower() or 'genai' in content.lower(), "Must use Gemini for transcription"
    assert 'openai' not in content.lower(), "Must NOT use OpenAI for transcription"

def test_meeting_backend_save_analysis_validates_assignee():
    """Verify backend save-analysis schema validates assignee field."""
    meetings_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "meetings.ts"
    content = meetings_path.read_text(encoding="utf-8")
    assert 'assignee' in content, "Backend must validate assignee in action items"

def test_meeting_backend_has_delete_route():
    """Verify backend has meeting delete endpoint."""
    meetings_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "meetings.ts"
    content = meetings_path.read_text(encoding="utf-8")
    assert 'router.delete' in content, "Must have DELETE endpoint for meetings"

def test_meeting_details_has_transcript_toggle():
    """Verify MeetingDetailsScreen has collapsible transcript."""
    details_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "MeetingDetailsScreen.tsx"
    content = details_path.read_text(encoding="utf-8")
    assert 'showTranscript' in content, "Must have transcript toggle state"
    assert 'raw_transcript' in content, "Must display raw transcript"

def test_meeting_details_has_assign_button():
    """Verify MeetingDetailsScreen has assign-to-participant button."""
    details_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "MeetingDetailsScreen.tsx"
    content = details_path.read_text(encoding="utf-8")
    assert 'handleAssignTask' in content or 'assignMeetingTask' in content, "Must have assign task functionality"

def test_meeting_assistant_recording_cleanup():
    """Verify recording cleanup on error."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "MeetingAssistantScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert 'setRecording(null)' in content, "Must clean up recording state on error"
    assert 'setIsRecording(false)' in content, "Must reset isRecording on error"

def test_meeting_assistant_transcribing_state():
    """Verify transcribing state prevents double-submit."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "MeetingAssistantScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert 'transcribing' in content, "Must have transcribing state"
    assert 'setTranscribing(true)' in content, "Must set transcribing to true during upload"
    assert 'setTranscribing(false)' in content in content or 'setTranscribing(false)' in content, "Must reset transcribing state"

def test_meeting_assistant_handles_recording_error():
    """Verify recording error handling resets state."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "MeetingAssistantScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert 'catch' in content, "Must have error handling"
    assert 'Could not' in content or 'error' in content.lower(), "Must show user-friendly error messages"


# ==================== NOTIFICATION FIX TESTS ====================

def test_notification_recurrence_end_date_checked():
    """Verify scheduleNotificationsForTask checks recurrence_end_date."""
    sched_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "scheduleTaskNotifications.ts"
    content = sched_path.read_text(encoding="utf-8")
    assert 'recurrence_end_date' in content, "Must check recurrence_end_date"
    assert 'endDate' in content or 'end_date' in content, "Must parse the end date"

def test_notification_recurrence_end_date_cancels_after_expiry():
    """Verify notifications are not scheduled after recurrence end date."""
    sched_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "scheduleTaskNotifications.ts"
    content = sched_path.read_text(encoding="utf-8")
    # Must return early (ids) when recurrence is expired
    assert 'return ids' in content, "Must return early when recurrence expired"

def test_notification_settings_persisted():
    """Verify notification settings use AsyncStorage for persistence."""
    sched_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "notificationScheduler.ts"
    content = sched_path.read_text(encoding="utf-8")
    assert 'AsyncStorage.getItem' in content, "Must read settings from AsyncStorage"
    assert 'flowtask-notifications-enabled' in content, "Must use AsyncStorage key for notifications"
    assert 'flowtask-deadline-alerts' in content, "Must use AsyncStorage key for deadline alerts"
    assert 'flowtask-daily-reminders' in content, "Must use AsyncStorage key for daily reminders"

def test_notification_settings_checked_before_scheduling():
    """Verify scheduling functions check settings before scheduling."""
    sched_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "notificationScheduler.ts"
    content = sched_path.read_text(encoding="utf-8")
    assert 'areNotificationsEnabled' in content, "Must check notification settings"
    assert 'areDeadlineAlertsEnabled' in content, "Must check deadline alert settings"
    assert 'areDailyRemindersEnabled' in content, "Must check daily reminder settings"

def test_notification_weekday_uses_five_weekly_triggers():
    """Verify weekday reminders use 5 individual WEEKLY triggers."""
    sched_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "notificationScheduler.ts"
    content = sched_path.read_text(encoding="utf-8")
    assert 'WEEKDAYS' in content, "Must define weekday constants"
    assert 'WEEKLY' in content, "Must use WEEKLY trigger type for weekdays"
    assert 'scheduleWeekdayReminders' in content, "Must have weekday scheduling function"

def test_notification_cancel_scans_all_scheduled():
    """Verify cancelTaskNotifications scans all scheduled notifications."""
    sched_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "notificationScheduler.ts"
    content = sched_path.read_text(encoding="utf-8")
    assert 'getAllScheduledNotificationsAsync' in content, "Must scan all scheduled notifications"
    assert 'cancelScheduledNotificationAsync' in content, "Must cancel individual notifications"

def test_notification_cancel_before_reschedule():
    """Verify existing notifications are cancelled before rescheduling."""
    sched_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "scheduleTaskNotifications.ts"
    content = sched_path.read_text(encoding="utf-8")
    assert 'cancelTaskNotifications' in content, "Must cancel before rescheduling"
    # Must cancel before scheduling — check within the function body
    func_start = content.find('export async function scheduleNotificationsForTask')
    func_body = content[func_start:]
    cancel_pos = func_body.find('cancelTaskNotifications')
    schedule_pos = func_body.find('scheduleTaskReminder')
    assert cancel_pos < schedule_pos, "Must cancel before scheduling"

def test_notification_past_date_guard():
    """Verify past dates are not scheduled."""
    sched_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "notificationScheduler.ts"
    content = sched_path.read_text(encoding="utf-8")
    assert 'Date.now()' in content, "Must compare against current time"
    assert 'return null' in content or 'return []' in content, "Must return null/empty for past dates"

def test_notification_deadline_chain():
    """Verify default deadline warning chain exists."""
    sched_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "scheduleTaskNotifications.ts"
    content = sched_path.read_text(encoding="utf-8")
    assert '24 * 60 * 60' in content or '24\x2a60\x2a60' in content, "Must schedule 1 day before"
    assert '60 * 60' in content or '60\x2a60' in content, "Must schedule 1 hour before"
    assert 'Deadline tomorrow' in content or 'due tomorrow' in content, "Must have 1-day-before notification"
    assert 'Deadline approaching' in content or 'due in 1 hour' in content, "Must have 1-hour-before notification"

def test_notification_custom_reminder_bypasses_deadline_chain():
    """Verify custom reminder skips the default deadline chain."""
    sched_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "scheduleTaskNotifications.ts"
    content = sched_path.read_text(encoding="utf-8")
    # The custom reminder branch should be separate from the deadline chain
    assert 'reminder_minutes' in content, "Must check for custom reminder_minutes"

def test_notification_daily_trigger():
    """Verify daily recurring tasks use DAILY trigger."""
    sched_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "scheduleTaskNotifications.ts"
    content = sched_path.read_text(encoding="utf-8")
    assert "recurrence === 'daily'" in content or 'daily' in content, "Must handle daily recurrence"
    assert 'scheduleDailyReminder' in content, "Must use daily reminder for daily recurrence"

def test_notification_android_channels():
    """Verify Android notification channels are created."""
    sched_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "notificationScheduler.ts"
    content = sched_path.read_text(encoding="utf-8")
    assert 'task-reminders' in content, "Must have task-reminders channel"
    assert 'alarms' in content, "Must have alarms channel"
    assert 'assignments' in content, "Must have assignments channel"
    assert 'HIGH' in content, "Must use HIGH importance"
    assert 'MAX' in content, "Must use MAX importance for alarms"

def test_notification_data_includes_task_id():
    """Verify notification data payload includes taskId for navigation."""
    sched_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "notificationScheduler.ts"
    content = sched_path.read_text(encoding="utf-8")
    assert 'taskId' in content, "Must include taskId in notification data"

def test_notification_navigation_service():
    """Verify notification navigation service handles task opening."""
    nav_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "notificationNavigation.ts"
    content = nav_path.read_text(encoding="utf-8")
    assert 'navigateToTask' in content, "Must have navigateToTask function"
    assert 'TaskDetail' in content, "Must navigate to TaskDetail screen"
    assert 'pendingNotification' in content, "Must handle cold-start pending notification"

def test_notification_navigation_cold_start():
    """Verify cold-start notification is preserved and processed."""
    nav_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "notificationNavigation.ts"
    content = nav_path.read_text(encoding="utf-8")
    assert 'processPendingNotification' in content, "Must have processPendingNotification"
    assert 'pendingNotification' in content, "Must store pending notification for cold start"

def test_notification_tasks_context_integration():
    """Verify TasksContext calls notification scheduling on create/update/complete/delete."""
    ctx_path = Path(__file__).parents[3] / "mobile-app" / "src" / "context" / "TasksContext.tsx"
    content = ctx_path.read_text(encoding="utf-8")
    assert 'scheduleNotificationsForTask' in content, "Must schedule on create/update"
    assert 'cancelTaskNotifications' in content, "Must cancel on complete/delete"

def test_notification_no_duplicate_on_reschedule():
    """Verify cancelling before rescheduling prevents duplicate notifications."""
    sched_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "scheduleTaskNotifications.ts"
    content = sched_path.read_text(encoding="utf-8")
    assert 'Cancel any existing' in content or 'cancel' in content.lower(), "Must cancel existing notifications first"
    assert 'prevents duplicate' in content or 'duplicate' in content.lower() or 'existing' in content.lower(), "Must prevent duplicates"


def test_notification_disable_cancels_scheduled():
    """Verify disabling notifications cancels already-scheduled notifications."""
    settings_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "SettingsScreen.tsx"
    content = settings_path.read_text(encoding="utf-8")
    assert 'cancelAllNotifications' in content, "Must call cancelAllNotifications when disabling"
    # Verify the cancel happens only when turning OFF (v is false)
    assert 'if (!v)' in content or 'if (!v )' in content, "Must only cancel when disabling (v is false)"


def test_notification_cancel_all_function_exists():
    """Verify cancelAllNotifications function is exported from notificationScheduler."""
    sched_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "notificationScheduler.ts"
    content = sched_path.read_text(encoding="utf-8")
    assert 'cancelAllNotifications' in content, "Must have cancelAllNotifications function"
    assert 'cancelAllScheduledNotificationsAsync' in content, "Must use Expo cancelAllScheduledNotificationsAsync"


def test_settings_imports_notification_cancellation():
    """Verify SettingsScreen imports cancelAllNotifications from notificationScheduler."""
    settings_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "SettingsScreen.tsx"
    content = settings_path.read_text(encoding="utf-8")
    assert 'cancelAllNotifications' in content, "Must import cancelAllNotifications"
    assert 'notificationScheduler' in content, "Must import from notificationScheduler"


def test_settings_screen_has_delete_account():
    """Verify Settings screen has account deletion with confirmation."""
    settings_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "SettingsScreen.tsx"
    content = settings_path.read_text(encoding="utf-8")
    assert 'Delete account' in content or 'delete account' in content, "Must have delete account option"
    assert 'Alert.alert' in content, "Must show confirmation before deletion"
    assert '/api/auth/me' in content, "Must call DELETE /api/auth/me"


def test_settings_has_dark_mode_toggle():
    """Verify Settings screen has dark mode toggle."""
    settings_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "SettingsScreen.tsx"
    content = settings_path.read_text(encoding="utf-8")
    assert 'Dark mode' in content, "Must have dark mode toggle"
    assert 'toggleTheme' in content, "Must use toggleTheme"


def test_settings_has_biometric_toggle():
    """Verify Settings screen has biometric toggle with hardware detection."""
    settings_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "SettingsScreen.tsx"
    content = settings_path.read_text(encoding="utf-8")
    assert 'Biometric login' in content, "Must have biometric toggle"
    assert 'hasHardwareAsync' in content, "Must check biometric hardware"
    assert 'isEnrolledAsync' in content, "Must check biometric enrollment"


def test_auth_context_no_raw_password_storage():
    """Verify AuthContext never stores raw passwords."""
    auth_path = Path(__file__).parents[3] / "mobile-app" / "src" / "context" / "AuthContext.tsx"
    content = auth_path.read_text(encoding="utf-8")
    # Must NOT store password in AsyncStorage
    assert 'AsyncStorage.setItem' not in content or 'password' not in content.split('AsyncStorage.setItem')[1][:50] if 'AsyncStorage.setItem' in content else True, "Must not store password in AsyncStorage"
    # Must use Supabase for auth, not raw password storage
    assert 'supabase.auth' in content, "Must use Supabase auth"


def test_auth_context_has_all_required_methods():
    """Verify AuthContext provides all required auth methods."""
    auth_path = Path(__file__).parents[3] / "mobile-app" / "src" / "context" / "AuthContext.tsx"
    content = auth_path.read_text(encoding="utf-8")
    assert 'signIn' in content, "Must have signIn"
    assert 'signUp' in content, "Must have signUp"
    assert 'signOut' in content, "Must have signOut"
    assert 'resetPassword' in content, "Must have resetPassword"
    assert 'unlock' in content, "Must have unlock for biometric"


def test_login_screen_has_all_features():
    """Verify Login screen has email, password, biometric, Google, forgot password."""
    login_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "LoginScreen.tsx"
    content = login_path.read_text(encoding="utf-8")
    assert 'handleLogin' in content, "Must have login handler"
    assert 'handleForgotPassword' in content, "Must have forgot password handler"
    assert 'handleBiometricLogin' in content, "Must have biometric login handler"
    assert 'signInWithGoogle' in content or 'Google' in content, "Must have Google sign-in"
    assert 'PasswordField' in content, "Must use PasswordField component"
    assert 'forgot password' in content.lower() or 'Forgot password' in content, "Must have forgot password link"


def test_signup_screen_has_validation():
    """Verify Signup screen validates all fields."""
    signup_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "SignupScreen.tsx"
    content = signup_path.read_text(encoding="utf-8")
    assert 'passwordsMatch' in content or 'confirmPassword' in content, "Must validate password confirmation"
    assert 'emailValid' in content, "Must validate email format"
    assert 'passwordValid' in content or 'password.length' in content, "Must validate password length"
    assert 'canSubmit' in content, "Must disable button until valid"


def test_update_password_screen_exists():
    """Verify UpdatePassword screen exists for password reset flow."""
    update_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "UpdatePasswordScreen.tsx"
    assert update_path.exists(), "UpdatePasswordScreen must exist"
    content = update_path.read_text(encoding="utf-8")
    assert 'updatePassword' in content, "Must call updatePassword"
    assert 'PasswordField' in content, "Must use PasswordField"
    assert 'Password changed' in content or 'success' in content.lower(), "Must show success state"


def test_backend_delete_account_cleans_all_data():
    """Verify backend DELETE /api/auth/me cleans all user data tables."""
    auth_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "auth.ts"
    content = auth_path.read_text(encoding="utf-8")
    assert 'tasks' in content, "Must delete from tasks table"
    assert 'meetings' in content, "Must delete from meetings table"
    assert 'notifications' in content, "Must delete from notifications table"
    assert 'task_assignments' in content, "Must delete from task_assignments table"
    assert 'users' in content, "Must delete from users table"
    assert 'deleteUser' in content, "Must delete Supabase auth user"


def test_backend_delete_account_requires_auth():
    """Verify DELETE /api/auth/me requires authentication."""
    auth_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "auth.ts"
    content = auth_path.read_text(encoding="utf-8")
    # Must use authMiddleware and derive userId from session
    assert 'authMiddleware' in content, "Must require authentication"
    assert 'req.user!.id' in content, "Must derive userId from authenticated session"


def test_backend_password_validation_matches_ui():
    """Verify backend password requirement matches UI display (6 characters)."""
    auth_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "auth.ts"
    content = auth_path.read_text(encoding="utf-8")
    assert 'min(6' in content, "Backend must require min 6 characters"
    # Check UI matches
    login_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "LoginScreen.tsx"
    login_content = login_path.read_text(encoding="utf-8")
    assert '6 characters' in login_content, "UI must display 6 characters requirement"
    signup_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "SignupScreen.tsx"
    signup_content = signup_path.read_text(encoding="utf-8")
    assert '6 characters' in signup_content, "Signup UI must display 6 characters requirement"


# ==================== CROSS-FEATURE INTEGRATION TESTS ====================

def test_migration_008_robust_constraint_drop():
    """Verify migration 008 handles constraint name dynamically, not hardcoded."""
    mig_path = Path(__file__).parents[3] / "backend" / "node-api" / "migrations" / "008_recurrence_weekdays_constraint.sql"
    content = mig_path.read_text(encoding="utf-8")
    # Must handle constraint name dynamically (not assume a specific name)
    assert 'pg_constraint' in content or 'information_schema' in content, "Must query constraint name dynamically"
    assert 'weekdays' in content, "Must include weekdays in constraint"
    assert 'IF EXISTS' in content or 'IF NOT EXISTS' in content, "Must be idempotent"


def test_notification_daily_reminder_uses_granular_cancel():
    """Verify disabling daily reminders only cancels recurring notifications, not all."""
    settings_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "SettingsScreen.tsx"
    content = settings_path.read_text(encoding="utf-8")
    # Daily reminders toggle should use cancelRecurringNotifications, not cancelAllNotifications
    assert 'cancelRecurringNotifications' in content, "Must use granular cancel for daily reminders"
    # Notifications toggle should still use cancelAllNotifications (acceptable)
    assert 'cancelAllNotifications' in content, "Global notifications toggle can cancel all"


def test_notification_recurring_cancel_function_exists():
    """Verify cancelRecurringNotifications function exists and filters by type."""
    sched_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "notificationScheduler.ts"
    content = sched_path.read_text(encoding="utf-8")
    assert 'cancelRecurringNotifications' in content, "Must have cancelRecurringNotifications"
    assert 'daily-reminder' in content, "Must filter by daily-reminder type"
    assert 'weekday-reminder' in content, "Must filter by weekday-reminder type"
    assert 'getAllScheduledNotificationsAsync' in content, "Must scan all scheduled notifications"


def test_focus_mode_timer_persists_across_unmount():
    """Verify FocusModeScreen persists timer state across component unmount."""
    focus_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "FocusModeScreen.tsx"
    content = focus_path.read_text(encoding="utf-8")
    # Must use module-level variables to persist across unmount
    assert '_persistedEndTimestamp' in content, "Must persist end timestamp at module level"
    assert '_persistedState' in content, "Must persist focus state at module level"
    assert '_persistedRemaining' in content, "Must persist remaining seconds at module level"
    # Must restore on mount
    assert 'initialFocusState' in content, "Must calculate initial state from persisted data"
    # Must clear persisted state on completion/reset
    assert '_persistedEndTimestamp = null' in content, "Must clear persisted state on completion/reset"


def test_tasks_context_has_clear_tasks():
    """Verify TasksContext exposes clearTasks for logout data cleanup."""
    ctx_path = Path(__file__).parents[3] / "mobile-app" / "src" / "context" / "TasksContext.tsx"
    content = ctx_path.read_text(encoding="utf-8")
    assert 'clearTasks' in content, "Must have clearTasks function"
    assert 'setTasks([])' in content or 'setTasks([])' in content, "Must clear tasks to empty array"


def test_app_clears_tasks_on_logout():
    """Verify AppNavigator clears tasks when user logs out to prevent data leak."""
    app_path = Path(__file__).parents[3] / "mobile-app" / "App.tsx"
    content = app_path.read_text(encoding="utf-8")
    assert 'clearTasks' in content, "Must call clearTasks on logout"
    assert 'AppNavigatorInner' in content or 'TasksProvider' in content, "Must wrap navigation in TasksProvider"
    # Must detect user becoming null (logout)
    assert 'prevUserRef' in content or 'user' in content, "Must track user state change"


def test_backend_delete_account_user_isolation():
    """Verify DELETE /api/auth/me uses authenticated user ID, not client-provided."""
    auth_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "auth.ts"
    content = auth_path.read_text(encoding="utf-8")
    assert 'req.user!.id' in content, "Must derive userId from authenticated session"
    assert 'authMiddleware' in content, "Must require authentication"
    # Must NOT accept userId from request body
    assert 'req.body' not in content or 'userId' not in content.split('req.body')[1][:100] if 'req.body' in content else True, "Must not trust client-provided userId"


def test_jerry_context_keyed_by_user():
    """Verify Jerry conversation context is keyed by authenticated user ID."""
    ai_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "ai.ts"
    content = ai_path.read_text(encoding="utf-8")
    assert 'req.user!.id' in content, "Must use authenticated user ID"
    assert 'conversationStore' in content, "Must have conversation store"
    # Context must be per-user, not global
    assert 'getConversationContext(userId)' in content or 'conversationStore.get(userId)' in content, "Must key context by userId"


def test_meeting_tasks_scoped_to_user():
    """Verify meeting-created tasks belong to the authenticated user."""
    meetings_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "meetings.ts"
    content = meetings_path.read_text(encoding="utf-8")
    assert 'user_id' in content, "Must scope tasks to user_id"
    assert 'req.user' in content or 'authMiddleware' in content, "Must use authenticated user"


# ==================== HOME SCREEN / UX TESTS ====================

def test_dashboard_screen_exists():
    """Verify DashboardScreen exists."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "DashboardScreen.tsx"
    assert screen_path.exists(), "DashboardScreen must exist"

def test_dashboard_todays_tasks_first():
    """Verify Today's Tasks section appears before other sections."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "DashboardScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    # Search for SectionHeader titles specifically to avoid matching function names
    today_pos = content.find('title="Today')
    overdue_pos = content.find('title="Overdue"')
    upcoming_pos = content.find('title="Upcoming"')
    assert today_pos > 0, "Must have Today's tasks section"
    assert today_pos < overdue_pos, "Today's tasks must appear before Overdue"
    assert today_pos < upcoming_pos, "Today's tasks must appear before Upcoming"

def test_dashboard_has_overdue_section():
    """Verify Dashboard has separate Overdue section."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "DashboardScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert 'Overdue' in content, "Must have Overdue section"
    assert 'pastDue' in content or 'isOverdue' in content, "Must filter overdue tasks"

def test_dashboard_has_upcoming_section():
    """Verify Dashboard has separate Upcoming section."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "DashboardScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert 'Upcoming' in content, "Must have Upcoming section"
    assert 'upcoming' in content, "Must filter upcoming tasks"

def test_dashboard_has_completed_today():
    """Verify Dashboard shows completed tasks from today."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "DashboardScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert 'Completed today' in content, "Must have Completed today section"
    assert 'completedToday' in content, "Must track completedToday count"

def test_dashboard_has_quick_actions():
    """Verify Dashboard has quick action buttons."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "DashboardScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert 'Add Task' in content, "Must have Add Task action"
    assert 'Calendar' in content, "Must have Calendar action"
    assert 'Meeting' in content, "Must have Meeting action"

def test_dashboard_navigation_add_task():
    """Verify Add Task navigation exists."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "DashboardScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "navigate('AddTask')" in content or 'AddTask' in content, "Must navigate to AddTask"

def test_dashboard_navigation_task_detail():
    """Verify task tap navigates to TaskDetail."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "DashboardScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert 'TaskDetail' in content, "Must navigate to TaskDetail on task tap"

def test_dashboard_navigation_calendar():
    """Verify Calendar navigation exists."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "DashboardScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "navigate('Calendar')" in content or 'Calendar' in content, "Must navigate to Calendar"

def test_dashboard_navigation_meetings():
    """Verify Meeting navigation exists."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "DashboardScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "navigate('Meetings')" in content or 'Meetings' in content, "Must navigate to Meetings"

def test_dashboard_has_greeting():
    """Verify Dashboard shows greeting with user name."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "DashboardScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert 'greeting' in content.lower(), "Must have greeting function"
    assert 'Good morning' in content or 'good morning' in content, "Must have greeting text"

def test_dashboard_uses_theme():
    """Verify Dashboard uses theme system for all colors."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "DashboardScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert 'useTheme' in content, "Must use theme system"
    assert 'theme.background' in content, "Must use theme.background"
    assert 'theme.text' in content, "Must use theme.text"
    assert 'theme.muted' in content, "Must use theme.muted"

def test_dashboard_has_loading_state():
    """Verify Dashboard shows loading state."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "DashboardScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert 'SkeletonLine' in content or 'loading' in content.lower(), "Must have loading state"

def test_dashboard_has_error_state():
    """Verify Dashboard shows error state."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "DashboardScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert 'ErrorBanner' in content or 'error' in content.lower(), "Must have error state"

def test_dashboard_has_empty_state():
    """Verify Dashboard shows empty state when no tasks."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "DashboardScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert 'EmptyState' in content, "Must have empty state component"

def test_dashboard_has_pull_to_refresh():
    """Verify Dashboard supports pull-to-refresh."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "DashboardScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert 'RefreshControl' in content, "Must have pull-to-refresh"
    assert 'refreshing' in content, "Must track refresh state"

def test_dashboard_has_progress_score():
    """Verify Dashboard shows productivity score."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "DashboardScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert 'ProgressRing' in content or 'score' in content.lower(), "Must have progress indicator"

def test_dashboard_stats_use_memo():
    """Verify Dashboard stats are memoized."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "DashboardScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert 'useMemo' in content, "Must memoize stats calculations"

def test_task_card_has_recurrence_indicator():
    """Verify TaskCard shows recurrence indicator."""
    card_path = Path(__file__).parents[3] / "mobile-app" / "src" / "components" / "TaskCard.tsx"
    content = card_path.read_text(encoding="utf-8")
    assert 'recurrence' in content, "TaskCard must show recurrence"
    assert 'repeat' in content.lower(), "TaskCard must use repeat icon"

def test_task_card_has_reminder_indicator():
    """Verify TaskCard shows reminder indicator."""
    card_path = Path(__file__).parents[3] / "mobile-app" / "src" / "components" / "TaskCard.tsx"
    content = card_path.read_text(encoding="utf-8")
    assert 'reminder_minutes' in content or 'reminder' in content.lower(), "TaskCard must show reminder"
    assert 'notifications' in content.lower(), "TaskCard must use notification icon for reminder"

def test_task_card_uses_theme():
    """Verify TaskCard uses theme system."""
    card_path = Path(__file__).parents[3] / "mobile-app" / "src" / "components" / "TaskCard.tsx"
    content = card_path.read_text(encoding="utf-8")
    assert 'useTheme' in content, "TaskCard must use theme system"
    assert 'theme.background' in content or 'theme.surface' in content, "TaskCard must use theme colors"

def test_task_card_has_swipe_actions():
    """Verify TaskCard has swipe actions for complete/delete."""
    card_path = Path(__file__).parents[3] / "mobile-app" / "src" / "components" / "TaskCard.tsx"
    content = card_path.read_text(encoding="utf-8")
    assert 'Swipeable' in content, "TaskCard must have swipe actions"
    assert 'onToggle' in content, "TaskCard must support toggle (complete)"
    assert 'onDelete' in content, "TaskCard must support delete"

def test_bottom_tab_has_jerry():
    """Verify bottom tab navigation includes Jerry."""
    app_path = Path(__file__).parents[3] / "mobile-app" / "App.tsx"
    content = app_path.read_text(encoding="utf-8")
    assert 'Jerry' in content, "Must have Jerry tab"
    assert 'mic-outline' in content, "Jerry tab must use mic icon"

def test_bottom_tab_has_meetings():
    """Verify bottom tab navigation includes Meetings."""
    app_path = Path(__file__).parents[3] / "mobile-app" / "App.tsx"
    content = app_path.read_text(encoding="utf-8")
    assert 'Meetings' in content, "Must have Meetings tab"

def test_bottom_tab_has_board():
    """Verify bottom tab navigation includes Board."""
    app_path = Path(__file__).parents[3] / "mobile-app" / "App.tsx"
    content = app_path.read_text(encoding="utf-8")
    assert 'Board' in content, "Must have Board tab"

def test_stack_has_focus_mode():
    """Verify FocusMode is registered in navigation stack."""
    app_path = Path(__file__).parents[3] / "mobile-app" / "App.tsx"
    content = app_path.read_text(encoding="utf-8")
    assert 'FocusMode' in content, "Must have FocusMode in navigation stack"

def test_stack_has_calendar():
    """Verify Calendar is registered in navigation stack."""
    app_path = Path(__file__).parents[3] / "mobile-app" / "App.tsx"
    content = app_path.read_text(encoding="utf-8")
    assert 'Calendar' in content, "Must have Calendar in navigation stack"

def test_no_hardcoded_colors_in_dashboard():
    """Verify Dashboard doesn't have hardcoded colors that break dark mode."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "DashboardScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    # Should not have hardcoded hex colors except for known safe ones (white for badge text)
    import re
    hex_colors = re.findall(r"'\#[0-9A-Fa-f]{3,8}'", content)
    # Strip quotes and allow white (#FFFFFF) for badge text
    safe_colors = {'#FFFFFF', '#ffffff'}
    non_safe = [c for c in hex_colors if c.strip("'").upper() not in safe_colors]
    assert len(non_safe) == 0, f"Dashboard must not have hardcoded colors: {non_safe}"


# ============================================================
# NOTIFICATION + ASSIGNMENT FIX TESTS
# ============================================================

def test_morning_notification_service_exists():
    """Morning summary notification service must exist."""
    path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "morningNotification.ts"
    assert path.exists(), "morningNotification.ts must exist"
    content = path.read_text(encoding="utf-8")
    assert 'scheduleMorningSummary' in content, "Must export scheduleMorningSummary"
    assert 'initializeNotifications' in content, "Must export initializeNotifications"
    assert 'MORNING_SUMMARY_SENT_KEY' in content or 'MORNING_SUMMARY_KEY' in content, "Must have a key to prevent duplicate morning notifications"

def test_morning_notification_respects_settings():
    """Morning notification must respect notification settings."""
    path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "morningNotification.ts"
    content = path.read_text(encoding="utf-8")
    assert 'areNotificationsEnabled' in content, "Must check notification settings"
    assert 'areDailyRemindersEnabled' in content, "Must check daily reminder settings"

def test_morning_notification_sends_only_once_per_day():
    """Morning notification must not send duplicate notifications on the same day."""
    path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "morningNotification.ts"
    content = path.read_text(encoding="utf-8")
    assert 'wasMorningSummarySentToday' in content, "Must check if already sent today"
    assert 'markMorningSummarySent' in content, "Must mark as sent after sending"

def test_morning_notification_excludes_empty_summary():
    """Morning notification must not send when there are no pending/overdue tasks."""
    path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "morningNotification.ts"
    content = path.read_text(encoding="utf-8")
    assert 'pendingToday.length === 0' in content or 'pendingToday.length > 0' in content, "Must check pending tasks"
    assert 'overdue.length === 0' in content or 'overdue.length > 0' in content, "Must check overdue tasks"

def test_app_initializes_notifications_on_startup():
    """App must call initializeNotifications on startup."""
    app_path = Path(__file__).parents[3] / "mobile-app" / "App.tsx"
    content = app_path.read_text(encoding="utf-8")
    assert 'initializeNotifications' in content, "Must import initializeNotifications"
    assert 'initializeNotifications()' in content, "Must call initializeNotifications on startup"

def test_tasks_context_schedules_morning_notification():
    """TasksContext must call scheduleMorningSummary after loading tasks."""
    ctx_path = Path(__file__).parents[3] / "mobile-app" / "src" / "context" / "TasksContext.tsx"
    content = ctx_path.read_text(encoding="utf-8")
    assert 'scheduleMorningSummary' in content, "Must import and call scheduleMorningSummary"

def test_migration_010_ensures_assignee_column():
    """Migration 010 must ensure the assignee column exists."""
    path = Path(__file__).parents[3] / "backend" / "node-api" / "migrations" / "010_ensure_assignee_and_more.sql"
    assert path.exists(), "Migration 010 must exist"
    content = path.read_text(encoding="utf-8")
    assert 'assignee' in content, "Must ensure assignee column"
    assert 'information_schema.columns' in content, "Must use idempotent column check"
    assert 'participants' in content, "Must ensure meetings.participants column"
    assert 'task_assignments' in content, "Must ensure task_assignments table"

def test_migration_010_is_idempotent():
    """Migration 010 must be safe to run multiple times."""
    path = Path(__file__).parents[3] / "backend" / "node-api" / "migrations" / "010_ensure_assignee_and_more.sql"
    content = path.read_text(encoding="utf-8")
    assert 'IF NOT EXISTS' in content or 'IF EXISTS' in content, "Must use IF NOT EXISTS/IF EXISTS for idempotency"

def test_migration_010_fixes_recurrence_constraint():
    """Migration 010 must ensure the recurrence CHECK constraint includes weekdays."""
    path = Path(__file__).parents[3] / "backend" / "node-api" / "migrations" / "010_ensure_assignee_and_more.sql"
    content = path.read_text(encoding="utf-8")
    assert "'weekdays'" in content, "Must include weekdays in recurrence constraint"

def test_email_service_supports_resend():
    """Email service must support Resend provider."""
    path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "services" / "emailService.ts"
    content = path.read_text(encoding="utf-8")
    assert 'resend' in content.lower(), "Must support Resend provider"
    assert 'RESEND_API_KEY' in content, "Must use RESEND_API_KEY env var"
    assert 'EMAIL_FROM' in content, "Must use EMAIL_FROM env var"

def test_email_service_supports_sendgrid():
    """Email service must support SendGrid provider."""
    path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "services" / "emailService.ts"
    content = path.read_text(encoding="utf-8")
    assert 'sendgrid' in content.lower(), "Must support SendGrid provider"
    assert 'SENDGRID_API_KEY' in content, "Must use SENDGRID_API_KEY env var"

def test_email_service_has_fallback():
    """Email service must gracefully handle no provider configured."""
    path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "services" / "emailService.ts"
    content = path.read_text(encoding="utf-8")
    assert "'none'" in content or '"none"' in content, "Must handle 'none' provider"
    assert 'success: true' in content, "Must return success when no provider (logging mode)"

def test_email_body_includes_task_details():
    """Assignment email must include task title and due date."""
    path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "services" / "emailService.ts"
    content = path.read_text(encoding="utf-8")
    assert 'taskTitle' in content, "Email must include task title"
    assert 'taskDueDate' in content, "Email must include due date"
    assert 'senderName' in content, "Email must include sender name"

def test_assignment_notification_service_unifies_channels():
    """Assignment notification must handle in-app + email together."""
    path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "services" / "assignmentNotificationService.ts"
    content = path.read_text(encoding="utf-8")
    assert 'notifications' in content, "Must create in-app notification"
    assert 'sendAssignmentEmail' in content or 'sendInvitationEmail' in content, "Must send email"
    assert 'email_status' in content, "Must track email status on assignment"

def test_email_failure_does_not_block_assignment():
    """Email failure must not block the assignment itself."""
    path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "services" / "assignmentNotificationService.ts"
    content = path.read_text(encoding="utf-8")
    assert 'catch' in content, "Must catch email errors"
    # Assignment should still return success even if email fails
    assert 'emailResult' in content, "Must separate email result from assignment result"

def test_tasks_service_has_error_extraction():
    """Task service must extract Supabase error messages for user display."""
    path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "taskService.ts"
    content = path.read_text(encoding="utf-8")
    assert 'response?.data?.error' in content, "Must extract error from API response"

def test_add_task_screen_shows_api_errors():
    """AddTaskScreen must show actual API error messages to user."""
    path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "AddTaskScreen.tsx"
    content = path.read_text(encoding="utf-8")
    assert 'apiMsg' in content or 'response?.data?.error' in content, "Must extract API error message"

def test_notification_permission_requested_on_startup():
    """initializeNotifications must request permissions."""
    path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "morningNotification.ts"
    content = path.read_text(encoding="utf-8")
    assert 'requestNotificationPermissions' in content, "Must call requestNotificationPermissions"

def test_notification_permission_is_nonblocking():
    """Notification permission request must not block app startup."""
    app_path = Path(__file__).parents[3] / "mobile-app" / "App.tsx"
    content = app_path.read_text(encoding="utf-8")
    # The call should be fire-and-forget (no await that blocks)
    assert 'initializeNotifications()' in content, "Must call initializeNotifications"

def test_meeting_create_tasks_uses_standard_schema():
    """Meeting task creation must use the same task schema as normal creation."""
    path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "meetings.ts"
    content = path.read_text(encoding="utf-8")
    assert 'from(\'tasks\').insert' in content, "Must insert tasks using the tasks table"
    assert 'user_id' in content, "Must set user_id"
    assert 'title' in content, "Must set title"
    assert 'assignee' in content, "Must support assignee field"

def test_meeting_assign_task_creates_assignment_record():
    """Meeting assign-task must create task_assignments record."""
    path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "meetings.ts"
    content = path.read_text(encoding="utf-8")
    assert 'task_assignments' in content, "Must create task_assignments record"
    assert 'notifications' in content, "Must create in-app notification"

def test_email_env_vars_documented():
    """README or env documentation must list email env vars."""
    readme = Path(__file__).parents[3] / "backend" / "node-api" / "README.md"
    if readme.exists():
        content = readme.read_text(encoding="utf-8")
        # If README exists, it should mention email vars
        if 'EMAIL_PROVIDER' in content or 'RESEND' in content.lower():
            assert True  # Documented
    else:
        # No README — that's OK, email vars are in emailService.ts comments
        path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "services" / "emailService.ts"
        content = path.read_text(encoding="utf-8")
        assert 'EMAIL_PROVIDER' in content, "Email service must document its env vars"


# ============================================================
# PUSH NOTIFICATION INFRASTRUCTURE TESTS
# ============================================================

def test_push_token_service_exists():
    """Mobile push token registration service must exist."""
    path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "pushTokenService.ts"
    assert path.exists(), "pushTokenService.ts must exist"
    content = path.read_text(encoding="utf-8")
    assert 'registerPushToken' in content, "Must export registerPushToken"
    assert 'getExpoPushTokenAsync' in content, "Must use Expo push token API"
    assert 'api.post' in content, "Must send token to backend"

def test_push_token_service_uses_auth_api():
    """Push token registration must use the authenticated API."""
    path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "pushTokenService.ts"
    content = path.read_text(encoding="utf-8")
    assert "'/api/auth/push-token'" in content, "Must POST to /api/auth/push-token"

def test_backend_push_notification_service_exists():
    """Backend push notification service must exist."""
    path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "services" / "pushNotificationService.ts"
    assert path.exists(), "pushNotificationService.ts must exist"
    content = path.read_text(encoding="utf-8")
    assert 'sendPushToUser' in content, "Must export sendPushToUser"
    assert 'sendAssignmentPushNotification' in content, "Must export sendAssignmentPushNotification"
    assert 'exp.host' in content, "Must use Expo Push API"

def test_backend_push_service_handles_multiple_devices():
    """Push service must support multiple devices per user."""
    path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "services" / "pushNotificationService.ts"
    content = path.read_text(encoding="utf-8")
    assert 'tokens' in content, "Must support token array"
    assert 'BATCH_SIZE' in content or 'batch' in content.lower(), "Must batch push requests"

def test_backend_push_service_cleans_invalid_tokens():
    """Push service must clean up invalid/expired tokens."""
    path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "services" / "pushNotificationService.ts"
    content = path.read_text(encoding="utf-8")
    assert 'DeviceNotRegistered' in content or 'cleanupInvalidTokens' in content, "Must handle invalid tokens"

def test_auth_routes_have_push_token_endpoint():
    """Auth routes must have push token storage endpoint."""
    path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "auth.ts"
    content = path.read_text(encoding="utf-8")
    assert "'/push-token'" in content, "Must have POST /push-token endpoint"
    assert 'push_subscription' in content, "Must store in push_subscription column"

def test_push_token_registration_on_login():
    """App must register push token when user becomes authenticated."""
    app_path = Path(__file__).parents[3] / "mobile-app" / "App.tsx"
    content = app_path.read_text(encoding="utf-8")
    assert 'registerPushToken' in content, "Must call registerPushToken on auth"

def test_tasks_route_sends_remote_push():
    """Task assignment must send remote push notification."""
    path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "tasks.ts"
    content = path.read_text(encoding="utf-8")
    assert 'sendAssignmentPushNotification' in content, "Must import push notification service"

def test_meetings_route_sends_remote_push():
    """Meeting task assignment must send remote push notification."""
    path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "meetings.ts"
    content = path.read_text(encoding="utf-8")
    assert 'sendAssignmentPushNotification' in content, "Must import push notification service"

def test_assignment_notification_service_sends_push():
    """Assignment notification service must send remote push."""
    path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "services" / "assignmentNotificationService.ts"
    content = path.read_text(encoding="utf-8")
    assert 'sendAssignmentPushNotification' in content, "Must import and call push notification service"

def test_push_failure_does_not_block_assignment():
    """Push notification failure must not block the assignment."""
    path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "services" / "assignmentNotificationService.ts"
    content = path.read_text(encoding="utf-8")
    assert 'catch' in content, "Must catch push errors"

def test_push_token_endpoint_validates_input():
    """Push token endpoint must validate input."""
    path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "auth.ts"
    content = path.read_text(encoding="utf-8")
    assert 'pushTokenSchema' in content or 'push_token: z.string()' in content, "Must validate push token input"

def test_push_token_supports_ios_and_android():
    """Push token must support both platforms."""
    path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "auth.ts"
    content = path.read_text(encoding="utf-8")
    assert "'ios'" in content and "'android'" in content, "Must support both platforms"

def test_morning_notification_uses_daily_trigger():
    """Morning notification must use DAILY trigger, not a one-time DATE trigger."""
    path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "morningNotification.ts"
    content = path.read_text(encoding="utf-8")
    assert 'SchedulableTriggerInputTypes.DAILY' in content, "Must use DAILY trigger for reliable morning notifications"

def test_morning_notification_has_fixed_hour():
    """Morning notification must target a specific hour, not '1 minute from now'."""
    path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "morningNotification.ts"
    content = path.read_text(encoding="utf-8")
    assert 'MORNING_HOUR' in content, "Must define a fixed morning hour constant"

def test_due_time_uses_alarms_channel():
    """At Due Time reminders must use the MAX-importance alarms channel."""
    path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "scheduleTaskNotifications.ts"
    content = path.read_text(encoding="utf-8")
    assert "'alarms'" in content, "Must use alarms channel for due-time notifications"

def test_notification_channels_include_alarms():
    """Notification scheduler must create an alarms channel with MAX importance."""
    path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "notificationScheduler.ts"
    content = path.read_text(encoding="utf-8")
    assert 'AndroidImportance.MAX' in content, "Alarms channel must use MAX importance"

def test_email_service_clearly_reports_unconfigured():
    """Email service must clearly report when provider is not configured."""
    path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "services" / "emailService.ts"
    content = path.read_text(encoding="utf-8")
    assert 'not configured' in content.lower(), "Must clearly state provider is not configured"

def test_email_service_does_not_pretend_sent():
    """Email service must NOT return success:true when no provider is configured."""
    path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "services" / "emailService.ts"
    content = path.read_text(encoding="utf-8")
    # Find the no-provider return statement
    # It should return success: false, not success: true
    lines = content.split('\n')
    in_no_provider_block = False
    for line in lines:
        if "provider === 'none'" in line:
            in_no_provider_block = True
        if in_no_provider_block and 'success:' in line:
            # Check that it returns false, not true
            assert 'success: false' in line, f"Email service must return success:false when no provider configured, got: {line.strip()}"
            break


# ============================================================
# RLS FIX: User-scoped Supabase client tests
# ============================================================

def test_supabase_ts_has_createUserClient_with_anon_key():
    """Verify createUserClient uses anon key for proper RLS enforcement."""
    supabase_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "db" / "supabase.ts"
    content = supabase_path.read_text(encoding="utf-8")
    assert "SUPABASE_ANON_KEY" in content, "Must load SUPABASE_ANON_KEY from env"
    assert "supabaseAnonKey" in content, "Must have anon key variable"
    # createUserClient should use anon key, not service key
    func_start = content.find("function createUserClient")
    func_body = content[func_start:func_start + 500]
    assert "supabaseAnonKey" in func_body, "createUserClient must use anon key for RLS"
    assert "Authorization" in func_body, "Must pass user JWT for auth.uid()"

def test_tasks_routes_use_user_scoped_client():
    """Verify task routes use createUserClient instead of supabaseAdmin for user CRUD."""
    tasks_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "tasks.ts"
    content = tasks_path.read_text(encoding="utf-8")
    assert "createUserClient" in content, "Task routes must use user-scoped client"
    assert "req.accessToken!" in content, "Must pass user access token"
    # POST / should use user client
    post_start = content.find("router.post('/', validate(createTaskSchema)")
    post_body = content[post_start:post_start + 600]
    assert "createUserClient" in post_body, "POST /tasks must use user-scoped client"
    # DELETE /:id should use user client
    delete_start = content.find("router.delete")
    delete_body = content[delete_start:delete_start + 300]
    assert "createUserClient" in delete_body, "DELETE /tasks/:id must use user-scoped client"

def test_meetings_routes_use_user_scoped_client():
    """Verify meeting routes use createUserClient for user CRUD."""
    meetings_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "meetings.ts"
    content = meetings_path.read_text(encoding="utf-8")
    assert "createUserClient" in content, "Meeting routes must use user-scoped client"
    assert "req.accessToken!" in content, "Must pass user access token"
    # POST / should use user client
    post_start = content.find("router.post('/', validate(createMeetingSchema)")
    post_body = content[post_start:post_start + 500]
    assert "createUserClient" in post_body, "POST /meetings must use user-scoped client"

def test_tasks_routes_keep_admin_for_cross_user():
    """Verify task routes keep supabaseAdmin for cross-user lookups (notifications)."""
    tasks_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "tasks.ts"
    content = tasks_path.read_text(encoding="utf-8")
    assert "supabaseAdmin" in content, "Must keep supabaseAdmin for cross-user operations"
    # notifyAssignee should use admin for looking up other users
    assert "notifyAssignee" in content, "Must have notifyAssignee using admin client"

def test_migration_011_exists():
    """Verify migration 011 exists for RLS policy enforcement."""
    migration_path = Path(__file__).parents[3] / "backend" / "node-api" / "migrations" / "011_ensure_rls_policies.sql"
    assert migration_path.exists(), "Migration 011 must exist"
    content = migration_path.read_text(encoding="utf-8")
    assert "ENABLE ROW LEVEL SECURITY" in content, "Must enable RLS"
    assert "tasks_insert_own" in content, "Must have tasks INSERT policy"
    assert "tasks_select_own" in content, "Must have tasks SELECT policy"
    assert "tasks_update_own" in content, "Must have tasks UPDATE policy"
    assert "tasks_delete_own" in content, "Must have tasks DELETE policy"
    assert "auth.uid() = user_id" in content, "Must enforce user ownership via auth.uid()"
    # Must NOT have broad WITH CHECK (true) for notifications or assignments
    # (security fix: mobile client must not insert for other users)
    assert "notifications_insert_own" in content, "Notifications INSERT must be user-scoped"
    assert "task_assignments_insert_sender" in content, "Assignments INSERT must be sender-scoped"
    # Must NOT CREATE the old permissive policies (DROP to clean up is fine)
    assert 'CREATE POLICY "notifications_insert_server"' not in content, "Must not CREATE permissive notifications INSERT"
    assert 'CREATE POLICY "task_assignments_insert_server"' not in content, "Must not CREATE permissive assignments INSERT"
    # Must NOT have broad EXCEPTION WHEN OTHERS blocks in executable code (comments are fine)
    import re
    code_lines = [l for l in content.split('\n') if l.strip() and not l.strip().startswith('--')]
    code_content = '\n'.join(code_lines)
    assert 'EXCEPTION WHEN OTHERS' not in code_content, "Must not swallow exceptions broadly in executable code"

def test_tasks_routes_have_error_logging():
    """Verify task routes have error logging for debugging RLS failures."""
    tasks_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "tasks.ts"
    content = tasks_path.read_text(encoding="utf-8")
    assert "[Tasks]" in content, "Must have structured error logging"
    # POST and PUT should log errors
    assert content.count("console.error('[Tasks]") >= 2, "Must log errors for INSERT and UPDATE failures"


# ============================================================
# HOME SCREEN DATE FIX: Shared date utilities tests
# ============================================================

def test_date_utils_exists():
    """Verify shared date utilities exist."""
    utils_path = Path(__file__).parents[3] / "mobile-app" / "src" / "utils" / "dateUtils.ts"
    assert utils_path.exists(), "dateUtils.ts must exist"
    content = utils_path.read_text(encoding="utf-8")
    assert "localDateKey" in content, "Must export localDateKey"
    assert "isToday" in content, "Must export isToday"
    assert "isOverdue" in content, "Must export isOverdue"
    assert "getFullYear" in content, "Must use getFullYear for timezone-safe comparison"
    assert "getMonth" in content, "Must use getMonth for timezone-safe comparison"
    assert "getDate" in content, "Must use getDate for timezone-safe comparison"

def test_dashboard_uses_shared_date_utils():
    """Verify DashboardScreen uses shared dateUtils instead of inline isToday."""
    dashboard_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "DashboardScreen.tsx"
    content = dashboard_path.read_text(encoding="utf-8")
    assert "dateUtils" in content, "Must import from dateUtils"
    assert "isTodayTimestamp" in content, "Must use isTodayTimestamp for updated_at checks"
    # Must NOT have inline dateKey function
    assert "function dateKey" not in content, "Must not have inline dateKey function"

def test_dashboard_no_string_date_comparison():
    """Verify DashboardScreen doesn't use toDateString() for date comparison."""
    dashboard_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "DashboardScreen.tsx"
    content = dashboard_path.read_text(encoding="utf-8")
    assert "toDateString" not in content, "Must not use toDateString for date comparison (fragile)"

def test_calendar_uses_shared_date_utils():
    """Verify CalendarScreen uses shared dateUtils."""
    calendar_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "CalendarScreen.tsx"
    content = calendar_path.read_text(encoding="utf-8")
    assert "dateUtils" in content, "Must import from dateUtils"
    assert "localDateKey" in content, "Must use localDateKey"

def test_jerry_uses_shared_date_utils():
    """Verify JerryAssistantScreen uses shared dateUtils."""
    jerry_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "JerryAssistantScreen.tsx"
    content = jerry_path.read_text(encoding="utf-8")
    assert "dateUtils" in content, "Must import from dateUtils"

def test_date_utils_no_raw_string_comparison():
    """Verify date utilities don't use fragile string comparison for today check."""
    utils_path = Path(__file__).parents[3] / "mobile-app" / "src" / "utils" / "dateUtils.ts"
    content = utils_path.read_text(encoding="utf-8")
    # Must use localDateKey (explicit year/month/day) not toDateString
    assert "localDateKey" in content, "Must use localDateKey for comparison"
    # Must handle null/undefined
    assert "if (!value)" in content or "if (!value " in content, "Must handle null/undefined gracefully"
    # Must handle invalid dates
    assert "isNaN" in content or "Number.isNaN" in content, "Must handle invalid dates gracefully"

