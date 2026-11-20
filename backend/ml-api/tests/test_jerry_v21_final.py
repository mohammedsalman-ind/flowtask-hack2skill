"""Final audit tests for Jerry V2.1 — deterministic, no Gemini calls."""
import json
import sys
from datetime import date, timedelta
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).parents[1]))
import main

client = TestClient(main.app)


# ---- Intent routing audit ----

def test_intent_routing_greetings_never_tasks(monkeypatch):
    """Greetings must NEVER become tasks."""
    monkeypatch.setattr(main, "client", None)
    greetings = [
        "Hi Jerry", "Hello", "Hey Jerry", "Good morning",
        "Namaste", "Jerry tum kaise ho?", "Namaskar Jerry",
    ]
    for text in greetings:
        resp = client.post("/api/ml/parse", json={"text": text})
        payload = resp.json()
        assert payload["intent"] in ("greeting", "conversation"), \
            f"'{text}' should be greeting/conversation, got {payload['intent']}"
        assert payload["title"] == "", f"'{text}' should not create a task"


def test_intent_routing_queries_never_tasks(monkeypatch):
    """Task queries must NEVER become tasks."""
    monkeypatch.setattr(main, "client", None)
    queries = [
        "What do I have today?", "What's overdue?",
        "Show my pending tasks", "What should I focus on today?",
        "Mere aaj ke tasks kya hain?",
    ]
    for text in queries:
        resp = client.post("/api/ml/parse", json={"text": text})
        payload = resp.json()
        assert payload["intent"] == "task_query", \
            f"'{text}' should be task_query, got {payload['intent']}"
        assert payload["title"] == ""


def test_intent_routing_out_of_scope_never_tasks(monkeypatch):
    """Out-of-scope questions must NEVER become tasks."""
    monkeypatch.setattr(main, "client", None)
    questions = [
        "Tell me a joke",
        "What is the capital of France?",
    ]
    for text in questions:
        resp = client.post("/api/ml/parse", json={"text": text})
        payload = resp.json()
        assert payload["intent"] != "task_create", \
            f"'{text}' should NOT be task_create, got {payload['intent']}"
        assert payload["title"] == ""


def test_intent_routing_conversation_never_tasks(monkeypatch):
    """Conversational phrases must NEVER become tasks."""
    monkeypatch.setattr(main, "client", None)
    phrases = [
        "Thanks Jerry", "Okay thanks", "Great", "Awesome",
        "Thanks for that",
    ]
    for text in phrases:
        resp = client.post("/api/ml/parse", json={"text": text})
        payload = resp.json()
        assert payload["intent"] in ("conversation", "greeting"), \
            f"'{text}' should be conversation, got {payload['intent']}"
        assert payload["title"] == ""


# ---- Date/time parsing audit ----

def test_date_parsing_preserves_time(monkeypatch):
    """'tomorrow at 5 PM' must preserve 17:00, not midnight."""
    monkeypatch.setattr(main, "client", None)
    resp = client.post("/api/ml/parse", json={"text": "Remind me to submit my assignment tomorrow at 5 PM"})
    payload = resp.json()
    assert payload["intent"] == "task_create"
    assert payload["due_date"], "due_date should be set"
    assert "17:00" in payload["due_date"], \
        f"due_date '{payload['due_date']}' should contain 17:00"


def test_date_parsing_no_time_defaults(monkeypatch):
    """'tomorrow' without time should not have a specific time."""
    monkeypatch.setattr(main, "client", None)
    resp = client.post("/api/ml/parse", json={"text": "Add a task to call Rahul tomorrow"})
    payload = resp.json()
    assert payload["intent"] == "task_create"
    assert payload["due_date"], "due_date should be set"
    # Should have some date, may or may not have time
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    assert tomorrow in payload["due_date"], \
        f"due_date '{payload['due_date']}' should contain {tomorrow}"


def test_date_parsing_friday(monkeypatch):
    """Friday should resolve to the upcoming Friday when task_create intent fires."""
    monkeypatch.setattr(main, "client", None)
    # Use explicit create verb to ensure task_create intent
    resp = client.post("/api/ml/parse", json={"text": "Add a task to finish my project by Friday"})
    payload = resp.json()
    assert payload["intent"] == "task_create"
    assert payload["due_date"], "due_date should be set for Friday"
    due = payload["due_date"].split("T")[0]
    parsed = date.fromisoformat(due)
    assert parsed.weekday() == 4, f"Due date {due} should be a Friday"


# ---- Language detection audit ----

def test_language_detection_consistency(monkeypatch):
    """Language detection should be consistent for same input."""
    monkeypatch.setattr(main, "client", None)
    hindi_cases = [
        ("Kal mujhe assignment submit karna hai", "hi"),
        ("Aaj mere tasks kya hain?", "hi"),
        ("Jerry tum kaise ho?", "hi"),
    ]
    for text, expected in hindi_cases:
        resp = client.post("/api/ml/parse", json={"text": text})
        payload = resp.json()
        assert payload["language"] == expected, \
            f"'{text}' should be {expected}, got {payload['language']}"

    english_cases = [
        ("What do I have today?", "en"),
        ("Create a task to call Rahul", "en"),
    ]
    for text, expected in english_cases:
        resp = client.post("/api/ml/parse", json={"text": text})
        payload = resp.json()
        assert payload["language"] == expected, \
            f"'{text}' should be {expected}, got {payload['language']}"


# ---- Task mutation audit ----

def test_task_mutation_intents(monkeypatch):
    """Task mutations should classify correctly."""
    monkeypatch.setattr(main, "client", None)
    cases = {
        "Mark my assignment as complete": "task_complete",
        "Delete the grocery task": "task_delete",
        "Move my assignment to Friday": "task_update",
        "Make the backend task high priority": "task_update",
    }
    for text, expected in cases.items():
        resp = client.post("/api/ml/parse", json={"text": text})
        payload = resp.json()
        assert payload["intent"] == expected, \
            f"'{text}' should be {expected}, got {payload['intent']}"


# ---- Meeting intent audit ----

def test_meeting_intents(monkeypatch):
    """Meeting queries should classify correctly."""
    monkeypatch.setattr(main, "client", None)
    cases = {
        "Summarize my last meeting": "meeting_query",
        "What happened in the meeting?": "meeting_query",
        "What were the action items from today's meeting?": "meeting_action_item_query",
        "Who agreed to do what?": "meeting_action_item_query",
    }
    for text, expected in cases.items():
        resp = client.post("/api/ml/parse", json={"text": text})
        payload = resp.json()
        assert payload["intent"] == expected, \
            f"'{text}' should be {expected}, got {payload['intent']}"


# ---- Fallback audit ----

def test_gemini_429_fallback_handles_clear_intents(monkeypatch):
    """When Gemini is unavailable, clear intents must still work."""
    class QuotaError(Exception):
        pass

    class FakeQuotaModels:
        def generate_content(self, **kwargs):
            raise QuotaError("429 Resource has been exhausted.")

    monkeypatch.setattr(main, "client", type("Client", (), {"models": FakeQuotaModels()})())

    cases = {
        "Hi Jerry": "greeting",
        "What do I have today?": "task_query",
        "What's overdue?": "task_query",
    }
    for text, expected in cases.items():
        resp = client.post("/api/ml/parse", json={"text": text})
        payload = resp.json()
        assert payload["intent"] == expected, \
            f"'{text}' should be {expected} under quota fallback, got {payload['intent']}"
        assert resp.status_code == 200


def test_gemini_429_ambiguous_returns_unclear(monkeypatch):
    """Ambiguous input under Gemini quota should return unclear, not crash."""
    class QuotaError(Exception):
        pass

    class FakeQuotaModels:
        def generate_content(self, **kwargs):
            raise QuotaError("429 Resource has been exhausted.")

    monkeypatch.setattr(main, "client", type("Client", (), {"models": FakeQuotaModels()})())

    resp = client.post("/api/ml/parse", json={"text": "something random"})
    payload = resp.json()
    assert resp.status_code == 200
    assert payload["intent"] == "unclear"
    assert payload["reply"]


# ---- Empty/edge cases ----

def test_empty_text_returns_400(monkeypatch):
    """Empty text must return 400."""
    monkeypatch.setattr(main, "client", None)
    resp = client.post("/api/ml/parse", json={"text": ""})
    assert resp.status_code == 400


def test_whitespace_only_returns_400(monkeypatch):
    """Whitespace-only text must return 400."""
    monkeypatch.setattr(main, "client", None)
    resp = client.post("/api/ml/parse", json={"text": "   "})
    assert resp.status_code == 400


# ---- Meeting analysis audit ----

def test_meeting_participant_extraction(monkeypatch):
    """Speaker labels in transcript should be extracted as participants."""
    monkeypatch.setattr(main, "client", None)
    transcript = "Somya: I will implement the feature.\nRahul: I will test it.\nPriya: I will deploy."
    resp = client.post("/api/ml/analyze-meeting", json={"transcript": transcript})
    payload = resp.json()
    assert resp.status_code == 200
    assert "participants" in payload
    participants = payload["participants"]
    assert "Somya" in participants
    assert "Rahul" in participants
    assert "Priya" in participants


def test_meeting_no_speakers_empty_participants(monkeypatch):
    """Transcript without speaker labels should return empty participants."""
    monkeypatch.setattr(main, "client", None)
    transcript = "The team discussed the project timeline and deliverables."
    resp = client.post("/api/ml/analyze-meeting", json={"transcript": transcript})
    payload = resp.json()
    assert resp.status_code == 200
    assert "participants" in payload
    assert isinstance(payload["participants"], list)
    # No speaker labels, so participants should be empty
    assert len(payload["participants"]) == 0


# ---- Version audit ----

def test_version_reports_correct_model(monkeypatch):
    """ML API should report the correct model and version."""
    resp = client.get("/api/ml/version")
    payload = resp.json()
    assert payload["version"] == "meeting-analysis-v3"
    assert payload["model"] == "gemini-2.5-flash"
    assert isinstance(payload["gemini_configured"], bool)


# ---- Recurring task field audit ----

def test_task_create_with_recurrence(monkeypatch):
    """Task creation should support recurrence field."""
    monkeypatch.setattr(main, "client", None)
    resp = client.post("/api/ml/parse", json={"text": "Remind me every day at 8 AM to study"})
    payload = resp.json()
    assert payload["intent"] == "task_create"
    assert payload["recurrence"] == "daily"
