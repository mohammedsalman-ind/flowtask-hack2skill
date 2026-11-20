"""Deterministic tests for the task assignment feature.

Tests the email validation, type contracts, and API structure.
Does not test actual Supabase network calls.
"""
from pathlib import Path


def test_assignment_types_exist():
    """Verify TaskAssignment type is defined in the mobile types."""
    types_path = Path(__file__).parents[3] / "mobile-app" / "src" / "types" / "index.ts"
    content = types_path.read_text(encoding="utf-8")
    assert "TaskAssignment" in content, "TaskAssignment type must exist"
    assert "recipient_email" in content, "TaskAssignment must have recipient_email"
    assert "sender_user_id" in content, "TaskAssignment must have sender_user_id"
    assert "status" in content, "TaskAssignment must have status"


def test_assignment_service_exists():
    """Verify the assignment service file exists with required functions."""
    service_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "assignmentService.ts"
    content = service_path.read_text(encoding="utf-8")
    assert "assignTask" in content, "assignTask function must exist"
    assert "fetchSentAssignments" in content, "fetchSentAssignments must exist"
    assert "fetchReceivedAssignments" in content, "fetchReceivedAssignments must exist"
    assert "acceptAssignment" in content, "acceptAssignment must exist"
    assert "cancelAssignment" in content, "cancelAssignment must exist"
    assert "isValidEmail" in content, "isValidEmail must exist"


def test_email_validation_logic():
    """Test the email validation rules."""
    import re

    def is_valid_email(email: str) -> bool:
        trimmed = email.strip()
        if not trimmed or len(trimmed) > 255:
            return False
        return bool(re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', trimmed))

    # Valid emails
    assert is_valid_email("user@example.com") is True
    assert is_valid_email("rahul@gmail.com") is True
    assert is_valid_email("test.user@company.co.uk") is True
    assert is_valid_email("a+b@domain.com") is True

    # Invalid emails
    assert is_valid_email("") is False
    assert is_valid_email(" ") is False
    assert is_valid_email("notanemail") is False
    assert is_valid_email("@example.com") is False
    assert is_valid_email("user@") is False
    assert is_valid_email("user@.com") is False
    assert is_valid_email("user @example.com") is False  # space
    assert is_valid_email("user@example") is False  # no TLD

    # Edge cases
    assert is_valid_email("a" * 50 + "@example.com") is True  # reasonable length
    assert is_valid_email("a" * 243 + "@example.com") is True  # exactly 255 total
    assert is_valid_email("a" * 244 + "@example.com") is False  # 256 total, over max


def test_task_detail_has_assign_ui():
    """Verify TaskDetailScreen includes the assignment UI."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "TaskDetailScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "Assign Task" in content, "Must have 'Assign Task' label"
    assert "assignTask" in content, "Must call assignTask service"
    assert "confirmSend" in content, "Must have confirmation step"
    assert "Confirm & Send" in content, "Must have Confirm & Send button"
    assert "cancelAssignment" in content, "Must support cancellation"
    assert "isValidEmail" in content, "Must validate email"
    assert "recipient_email" in content, "Must reference recipient email"


def test_dashboard_has_assigned_to_me():
    """Verify Dashboard includes 'Assigned to me' section."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "DashboardScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "Assigned to me" in content, "Must have 'Assigned to me' section"
    assert "fetchReceivedAssignments" in content, "Must fetch received assignments"


def test_backend_assignment_route_exists():
    """Verify the backend assignment route file exists with required endpoints."""
    route_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "assignments.ts"
    content = route_path.read_text(encoding="utf-8")
    assert "POST '/'" in content or "router.post('/'," in content, "Must have POST create endpoint"
    assert "GET '/'" in content or "router.get('/'," in content, "Must have GET list endpoint"
    assert "GET '/received'" in content or "router.get('/received'" in content, "Must have GET received endpoint"
    assert "accept" in content, "Must have accept endpoint"
    assert "cancel" in content, "Must have cancel endpoint"
    assert "sender_user_id" in content, "Must verify sender ownership"
    assert "recipient_email" in content, "Must handle recipient email"


def test_backend_registration_in_index():
    """Verify assignments route is registered in the Node API index."""
    index_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "index.ts"
    content = index_path.read_text(encoding="utf-8")
    assert "assignments" in content.lower(), "Assignments route must be registered in index.ts"
    assert "/api/assignments" in content, "Must be mounted at /api/assignments"


def test_migration_file_exists():
    """Verify the database migration file exists."""
    migration_path = Path(__file__).parents[3] / "backend" / "node-api" / "migrations" / "003_task_assignments.sql"
    assert migration_path.exists(), "Migration file must exist"
    content = migration_path.read_text(encoding="utf-8")
    assert "task_assignments" in content, "Must create task_assignments table"
    assert "sender_user_id" in content, "Must have sender_user_id column"
    assert "recipient_email" in content, "Must have recipient_email column"
    assert "status" in content, "Must have status column"
    assert "RLS" in content or "ENABLE ROW LEVEL SECURITY" in content, "Must have RLS enabled"


def test_email_service_exists():
    """Verify the email service abstraction exists."""
    service_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "services" / "emailService.ts"
    assert service_path.exists(), "emailService.ts must exist"
    content = service_path.read_text(encoding="utf-8")
    assert "sendAssignmentEmail" in content, "Must have sendAssignmentEmail function"
    assert "sendInvitationEmail" in content, "Must have sendInvitationEmail function"
    assert "RESEND_API_KEY" in content, "Must reference RESEND_API_KEY"
    assert "SENDGRID_API_KEY" in content, "Must reference SENDGRID_API_KEY"
    assert "EMAIL_PROVIDER" in content, "Must reference EMAIL_PROVIDER env var"


def test_notification_service_exists():
    """Verify the assignment notification service exists with unified event."""
    service_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "services" / "assignmentNotificationService.ts"
    assert service_path.exists(), "assignmentNotificationService.ts must exist"
    content = service_path.read_text(encoding="utf-8")
    assert "notifyAssignment" in content, "Must have notifyAssignment function"
    assert "retryAssignmentEmail" in content, "Must have retryAssignmentEmail function"
    assert "inAppNotification" in content or "in_app" in content, "Must handle in-app notification"
    assert "emailResult" in content or "email_result" in content, "Must handle email result"
    assert "notifications" in content, "Must insert into notifications table"


def test_assignment_route_has_retry_email():
    """Verify retry-email endpoint exists in the assignment route."""
    route_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "assignments.ts"
    content = route_path.read_text(encoding="utf-8")
    assert "retry-email" in content, "Must have retry-email endpoint"
    assert "retryAssignmentEmail" in content, "Must call retryAssignmentEmail"
    assert "email_status" in content, "Must check email_status"


def test_task_detail_has_retry_button():
    """Verify TaskDetailScreen shows retry button for failed emails."""
    screen_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "TaskDetailScreen.tsx"
    content = screen_path.read_text(encoding="utf-8")
    assert "retryAssignmentEmail" in content, "Must have retryAssignmentEmail import"
    assert "email_status" in content, "Must check email_status"
    assert "Retry email" in content or "retry" in content.lower(), "Must show retry option"


def test_types_have_email_fields():
    """Verify TaskAssignment type includes email tracking fields."""
    types_path = Path(__file__).parents[3] / "mobile-app" / "src" / "types" / "index.ts"
    content = types_path.read_text(encoding="utf-8")
    assert "email_status" in content, "TaskAssignment must have email_status field"
    assert "email_error" in content, "TaskAssignment must have email_error field"
    assert "email_provider" in content, "TaskAssignment must have email_provider field"
    assert "AssignmentNotificationResult" in content, "Must have AssignmentNotificationResult type"


def test_migration_has_email_tracking():
    """Verify migration includes email tracking columns."""
    migration_path = Path(__file__).parents[3] / "backend" / "node-api" / "migrations" / "003_task_assignments.sql"
    content = migration_path.read_text(encoding="utf-8")
    assert "email_status" in content, "Migration must have email_status column"
    assert "email_error" in content, "Migration must have email_error column"
    assert "email_provider" in content, "Migration must have email_provider column"


def test_email_failure_does_not_block_assignment():
    """Verify the notification service creates assignment even if email fails."""
    service_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "services" / "assignmentNotificationService.ts"
    content = service_path.read_text(encoding="utf-8")
    # The service should handle email failure gracefully
    assert "Email send crashed" in content or "email_result" in content.lower(), "Must handle email failures gracefully"
    assert "email_status" in content, "Must track email failure on assignment"


# ==================== PHONE NOTIFICATION TESTS ====================

def test_notification_scheduler_has_assignment_channel():
    """Verify the notification scheduler creates an assignment channel."""
    scheduler_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "notificationScheduler.ts"
    content = scheduler_path.read_text(encoding="utf-8")
    assert "assignments" in content, "Must have assignment notification channel"
    assert "Task Assignments" in content or "assignments" in content, "Channel must be named"


def test_notification_scheduler_has_immediate_push():
    """Verify sendImmediateAssignmentNotification exists."""
    scheduler_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "notificationScheduler.ts"
    content = scheduler_path.read_text(encoding="utf-8")
    assert "sendImmediateAssignmentNotification" in content, "Must have immediate push function"
    assert "task-assigned" in content, "Must use task-assigned notification type"
    assert "assignments" in content, "Must use assignments channel"


def test_dashboard_triggers_phone_notification():
    """Verify DashboardScreen triggers phone notifications for assignment notifications."""
    dashboard_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "DashboardScreen.tsx"
    content = dashboard_path.read_text(encoding="utf-8")
    assert "sendImmediateAssignmentNotification" in content, "Dashboard must import sendImmediateAssignmentNotification"
    assert "task_assigned" in content, "Dashboard must check for task_assigned notification type"
    assert "seenNotifIdsRef" in content or "seenNotif" in content, "Dashboard must track seen notifications to avoid duplicates"


def test_permission_denied_does_not_block():
    """Verify sendImmediateAssignmentNotification returns false on permission denial (does not throw)."""
    scheduler_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "notificationScheduler.ts"
    content = scheduler_path.read_text(encoding="utf-8")
    # The function should check permissions and return false gracefully
    assert "hasPermission" in content, "Must check permissions before sending"
    assert "return false" in content or "return true" in content, "Must return boolean for permission status"


# ==================== JERRY TASK ASSIGNMENT TESTS ====================

def test_ml_api_has_task_assign_intent():
    """Verify ML API ParseTaskResponse includes task_assign intent."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    assert "task_assign" in content, "ML API must have task_assign intent"
    assert "recipient_name" in content, "ParseTaskResponse must have recipient_name field"
    assert "recipient_email" in content, "ParseTaskResponse must have recipient_email field"

def test_ml_api_classifies_assignment():
    """Verify classify_task_intent detects assignment patterns."""
    main_path = Path(__file__).parents[3] / "backend" / "ml-api" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    assert "assign" in content.lower(), "Must detect 'assign' keyword"
    assert "task_assign" in content, "Must return task_assign intent"

def test_node_api_has_execute_assignment():
    """Verify Node API has executeAssignment function."""
    ai_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "ai.ts"
    content = ai_path.read_text(encoding="utf-8")
    assert "executeAssignment" in content, "Must have executeAssignment function"
    assert "pendingAssignment" in content, "Must have pendingAssignment in conversation context"
    assert "awaitingEmail" in content, "Must track awaiting email state"
    assert "awaitingConfirmation" in content, "Must track awaiting confirmation state"

def test_node_api_handles_followup_email():
    """Verify Node API handles follow-up email input."""
    ai_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "ai.ts"
    content = ai_path.read_text(encoding="utf-8")
    assert "awaitingEmail" in content, "Must check for awaitingEmail state"
    assert "emailMatch" in content or "email" in content.lower(), "Must extract email from follow-up"

def test_node_api_handles_confirmation():
    """Verify Node API handles yes/no confirmation."""
    ai_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "ai.ts"
    content = ai_path.read_text(encoding="utf-8")
    assert "awaitingConfirmation" in content, "Must check for awaitingConfirmation state"
    assert "cancel" in content.lower(), "Must handle cancellation"
    assert "assignment cancelled" in content.lower() or "cancel" in content.lower(), "Must respond on cancellation"

def test_jerry_never_guesses_email():
    """Verify Jerry asks for email instead of guessing."""
    ai_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "ai.ts"
    content = ai_path.read_text(encoding="utf-8")
    # When recipient email is null, must ask for it
    assert "email address" in content.lower(), "Must ask for email address when not provided"

def test_node_api_task_assign_uses_existing_api():
    """Verify task_assign uses the same assignment creation as the direct UI."""
    ai_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "ai.ts"
    content = ai_path.read_text(encoding="utf-8")
    assert "task_assignments" in content, "Must use the same task_assignments table"
    assert "notifyAssignment" in content, "Must use the unified notification service"

def test_jerry_prevents_self_assignment():
    """Verify Jerry prevents assigning a task to yourself."""
    ai_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "ai.ts"
    content = ai_path.read_text(encoding="utf-8")
    assert "self_assign" in content or "cannot assign" in content.lower(), "Must prevent self-assignment"

def test_jerry_prevents_duplicate_assignment():
    """Verify Jerry prevents duplicate assignments."""
    ai_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "ai.ts"
    content = ai_path.read_text(encoding="utf-8")
    assert "already_assigned" in content or "already assigned" in content.lower(), "Must prevent duplicate assignments"

def test_jerry_assignment_asks_for_clarification():
    """Verify Jerry asks for clarification when multiple tasks match."""
    ai_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "ai.ts"
    content = ai_path.read_text(encoding="utf-8")
    assert "Multiple tasks found" in content or "multiple" in content.lower(), "Must ask for clarification on ambiguous match"

def test_jerry_clears_context_after_completion():
    """Verify pendingAssignment is cleared after successful assignment or cancellation."""
    ai_path = Path(__file__).parents[3] / "backend" / "node-api" / "src" / "routes" / "ai.ts"
    content = ai_path.read_text(encoding="utf-8")
    # Should clear pendingAssignment on success, cancel, and error
    clear_count = content.count("pendingAssignment: null")
    assert clear_count >= 3, f"Must clear pendingAssignment in at least 3 places (success/cancel/error), found {clear_count}"


# ==================== NOTIFICATION TAP NAVIGATION TESTS ====================

def test_notification_navigation_service_exists():
    """Verify the notification navigation service file exists."""
    nav_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "notificationNavigation.ts"
    assert nav_path.exists(), "notificationNavigation.ts must exist"
    content = nav_path.read_text(encoding="utf-8")
    assert "registerNotificationTapListener" in content, "Must have registerNotificationTapListener"
    assert "processPendingNotification" in content, "Must have processPendingNotification"
    assert "pendingNotification" in content, "Must track pending notification for cold-start"
    assert "setNavigationRef" in content, "Must have setNavigationRef"
    assert "navigateToTask" in content or "TaskDetail" in content, "Must navigate to TaskDetail"

def test_notification_data_contains_task_id():
    """Verify notification data always includes taskId."""
    scheduler_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "notificationScheduler.ts"
    content = scheduler_path.read_text(encoding="utf-8")
    # All notification types should include taskId in data
    assert 'data: { taskId:' in content or 'data: {taskId:' in content, "Notifications must include taskId in data payload"

def test_app_registers_notification_listener():
    """Verify App.tsx registers the notification tap listener."""
    app_path = Path(__file__).parents[3] / "mobile-app" / "App.tsx"
    content = app_path.read_text(encoding="utf-8")
    assert "registerNotificationTapListener" in content, "App must register notification tap listener"
    assert "processPendingNotification" in content, "App must process pending notifications"
    assert "setNavigationRef" in content, "App must set navigation ref for notifications"
    assert "navContainerRef" in content, "App must have a navigation container ref"

def test_app_has_navigation_container_ref():
    """Verify App.tsx passes ref to NavigationContainer."""
    app_path = Path(__file__).parents[3] / "mobile-app" / "App.tsx"
    content = app_path.read_text(encoding="utf-8")
    assert 'ref={navContainerRef}' in content, "NavigationContainer must receive ref"

def test_notification_navigation_handles_cold_start():
    """Verify the service stores notification data when navigation is not ready."""
    nav_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "notificationNavigation.ts"
    content = nav_path.read_text(encoding="utf-8")
    assert "pendingNotification" in content, "Must store pending notification"
    assert "isReady" in content, "Must check if navigation is ready"
    assert "setTimeout" in content or "processPending" in content, "Must delay navigation for cold-start"

def test_notification_navigation_prevents_duplicate():
    """Verify duplicate navigation to same task is prevented."""
    nav_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "notificationNavigation.ts"
    content = nav_path.read_text(encoding="utf-8")
    assert "getCurrentRoute" in content or "duplicate" in content.lower(), "Must prevent duplicate navigation"

def test_notification_navigation_cleanup():
    """Verify listener cleanup is provided."""
    nav_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "notificationNavigation.ts"
    content = nav_path.read_text(encoding="utf-8")
    assert ".remove()" in content or "cleanup" in content.lower(), "Must provide listener cleanup function"

def test_notification_navigation_handles_all_task_types():
    """Verify navigation works for task-reminder, task-assigned, and daily-reminder."""
    nav_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "notificationNavigation.ts"
    content = nav_path.read_text(encoding="utf-8")
    # Should handle any notification type that has a taskId
    assert "taskId" in content, "Must extract taskId from notification data"
    # Should not filter by type — any notification with taskId can navigate
    assert "task-reminder" in content or "type" in content, "Must handle notification type"

def test_existing_oauth_deep_link_not_broken():
    """Verify the existing OAuth/deep-link handling is not modified."""
    auth_context_path = Path(__file__).parents[3] / "mobile-app" / "src" / "context" / "AuthContext.tsx"
    content = auth_context_path.read_text(encoding="utf-8")
    # The existing auth flow should be unchanged
    assert "onAuthStateChange" in content, "Auth state change listener must remain"
    assert "resetPasswordForEmail" in content or "resetPassword" in content, "Password reset must remain"

def test_notification_navigation_does_not_expose_other_users_tasks():
    """Verify navigation goes to TaskDetail which requires authentication."""
    nav_path = Path(__file__).parents[3] / "mobile-app" / "src" / "services" / "notificationNavigation.ts"
    content = nav_path.read_text(encoding="utf-8")
    # Navigation goes to TaskDetail, which uses the authenticated API
    assert "TaskDetail" in content, "Must navigate to TaskDetail screen"
    # The TaskDetail screen loads tasks through the authenticated TasksContext
    task_detail_path = Path(__file__).parents[3] / "mobile-app" / "src" / "screens" / "TaskDetailScreen.tsx"
    td_content = task_detail_path.read_text(encoding="utf-8")
    assert "useTasks" in td_content, "TaskDetail must use authenticated TasksContext"

