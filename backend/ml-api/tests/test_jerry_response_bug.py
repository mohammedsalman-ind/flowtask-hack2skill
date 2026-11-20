"""Regression tests for Jerry Assistant response-generation bug.

Validates:
1. Successful task creation returns a positive confirmation and never an unclear/out_of_scope message.
2. Duplicate task creation accurately reports duplicate status.
3. Backend execution errors are reported accurately instead of claiming success or claiming unclear intent.
4. Task queries return responses based on actual task data (e.g. 'You have no tasks due today.').
5. Greetings like 'Hi Jerry' receive a greeting, not an unclear-request response.
6. Genuinely unclear requests receive appropriate clarification.
7. Mutation intents (complete, delete, update) return appropriate confirmations.
8. Fallback reply dictionary covers all productivity intents without defaulting to 'unclear'.
"""
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).parents[1]))
import main
from main import jerry_reply, generate_jerry_response, ResponseContext

client = TestClient(main.app)


def test_successful_task_create_phase1_and_phase2(monkeypatch):
    """'Add a task to complete my notes' must parse as task_create and generate a success response."""
    monkeypatch.setattr(main, "client", None)

    # Phase 1: parse intent
    resp = client.post("/api/ml/parse", json={"text": "Add a task to complete my notes"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["intent"] == "task_create"
    assert data["title"].lower() == "complete my notes"

    # Phase 2: response generation after backend execution
    ctx = {
        "intent": "task_create",
        "created_task": {
            "id": "task-uuid-123",
            "title": "Complete my notes",
            "priority": "medium",
            "due_date": None,
        },
    }
    resp2 = client.post(
        "/api/ml/parse",
        json={
            "text": "Add a task to complete my notes",
            "response_context": ctx,
        },
    )
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["intent"] == "task_create"
    reply = data2.get("reply") or data2.get("response") or ""
    assert "Done!" in reply or "added" in reply.lower(), f"Expected success message, got: {reply}"
    assert "Complete my notes" in reply, f"Expected task title in reply, got: {reply}"
    assert "to your tasks" in reply, f"Expected 'to your tasks' in reply, got: {reply}"
    assert "couldn't understand" not in reply.lower()
    assert "out of scope" not in reply.lower()


def test_task_create_duplicate_response(monkeypatch):
    """Duplicate task creation must inform the user the task already exists."""
    monkeypatch.setattr(main, "client", None)

    ctx = {
        "intent": "task_create",
        "created_task": None,
        "duplicate": True,
    }
    resp = client.post(
        "/api/ml/parse",
        json={
            "text": "Add a task to complete my notes",
            "response_context": ctx,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    reply = data.get("reply") or data.get("response") or ""
    assert "already exists" in reply.lower(), f"Expected duplicate warning, got: {reply}"
    assert "couldn't understand" not in reply.lower()


def test_task_create_backend_failure_response(monkeypatch):
    """Backend failure during task creation must report error and not claim success or unclear."""
    monkeypatch.setattr(main, "client", None)

    ctx = {
        "intent": "task_create",
        "created_task": None,
        "error": True,
    }
    resp = client.post(
        "/api/ml/parse",
        json={
            "text": "Add a task to complete my notes",
            "response_context": ctx,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    reply = data.get("reply") or data.get("response") or ""
    assert "error" in reply.lower() or "couldn't create" in reply.lower() or "failed" in reply.lower(), \
        f"Expected failure report, got: {reply}"
    assert "Done!" not in reply
    assert "added" not in reply.lower()
    assert "couldn't understand that as a FlowTask request" not in reply


def test_task_query_due_today_empty(monkeypatch):
    """Task query for today when 0 tasks are due must accurately report 0 tasks, not invent data."""
    monkeypatch.setattr(main, "client", None)

    ctx = {
        "intent": "task_query",
        "query": "today",
        "matched_tasks": [],
        "label": "due today",
    }
    resp = client.post(
        "/api/ml/parse",
        json={
            "text": "What tasks are due today?",
            "response_context": ctx,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    reply = data.get("reply") or data.get("response") or ""
    assert "no tasks due today" in reply.lower(), f"Expected 'no tasks due today', got: {reply}"
    assert "couldn't understand" not in reply.lower()


def test_task_query_due_today_with_tasks(monkeypatch):
    """Task query for today with tasks must list the tasks accurately."""
    monkeypatch.setattr(main, "client", None)

    ctx = {
        "intent": "task_query",
        "query": "today",
        "matched_tasks": [{"id": "t1", "title": "Complete my notes"}],
        "label": "due today",
    }
    resp = client.post(
        "/api/ml/parse",
        json={
            "text": "What tasks are due today?",
            "response_context": ctx,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    reply = data.get("reply") or data.get("response") or ""
    assert "Complete my notes" in reply
    assert "1 due today task" in reply or "due today" in reply


def test_hi_jerry_greeting(monkeypatch):
    """'Hi Jerry' must return a greeting reply, not an unclear-request response."""
    monkeypatch.setattr(main, "client", None)

    resp = client.post("/api/ml/parse", json={"text": "Hi Jerry"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["intent"] in ("greeting", "conversation")
    reply = data.get("reply") or ""
    assert "Hi!" in reply or "help" in reply.lower()
    assert "couldn't understand" not in reply.lower()


def test_genuinely_unclear_request(monkeypatch):
    """Genuinely unclear request returns appropriate clarification."""
    monkeypatch.setattr(main, "client", None)

    resp = client.post("/api/ml/parse", json={"text": "xyz random gibberish 99999"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["intent"] == "unclear"
    reply = data.get("reply") or ""
    assert "couldn't understand" in reply.lower() or "tasks, meetings" in reply.lower()


def test_jerry_reply_never_defaults_to_unclear_for_supported_intents():
    """All supported productivity intents must have defined replies and never fall back to unclear."""
    productivity_intents = [
        "task_create",
        "task_query",
        "task_complete",
        "task_delete",
        "task_update",
        "task_assign",
        "meeting_query",
        "meeting_action_item_query",
    ]
    for intent in productivity_intents:
        reply_en = jerry_reply(intent, "en")
        assert "couldn't understand that as a FlowTask request" not in reply_en, \
            f"Intent {intent} in en fell back to unclear message: {reply_en}"
        reply_hi = jerry_reply(intent, "hi")
        assert "samajh nahi paya" not in reply_hi, \
            f"Intent {intent} in hi fell back to unclear message: {reply_hi}"
