import json
import sys
from datetime import date, timedelta
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).parents[1]))
import main


client = TestClient(main.app)


def test_parse_classifies_queries_without_gemini(monkeypatch):
    monkeypatch.setattr(main, "client", None)

    cases = {
        "What do I have to do today?": "today",
        "What tasks are due tomorrow?": "tomorrow",
        "What is overdue?": "overdue",
        "What tasks are pending?": "pending",
        "What do I need to finish this week?": "this_week",
        "Do I have anything urgent?": "urgent",
        "What have I completed?": "completed",
    }
    for text, query in cases.items():
        response = client.post("/api/ml/parse", json={"text": text})
        assert response.status_code == 200
        assert response.json()["intent"] == "task_query"
        assert response.json()["query"] == query
        assert response.json()["title"] == ""


def test_parse_keeps_create_task_contract(monkeypatch):
    monkeypatch.setattr(main, "client", None)
    assert main.classify_task_intent("Add a task to finish my report tomorrow") == ("task_create", None)
    response = client.post("/api/ml/parse", json={"text": "Add a task to finish my report tomorrow"})
    assert response.status_code == 200
    assert response.json()["intent"] == "task_create"
    assert response.json()["title"]


def test_parse_classifies_greeting_without_gemini(monkeypatch):
    monkeypatch.setattr(main, "client", None)
    for text in ["Hi Jerry", "Hello Jerry", "hello", "hey there", "Good morning"]:
        response = client.post("/api/ml/parse", json={"text": text})
        assert response.status_code == 200
        payload = response.json()
        assert payload["intent"] == "greeting"
        assert payload["reply"]
        assert payload["title"] == ""


def _mock_gemini_reply(monkeypatch, response_dict):
    class FakeModels:
        def generate_content(self, **kwargs):
            return type("Response", (), {"text": json.dumps(response_dict)})()

    monkeypatch.setattr(main, "client", type("Client", (), {"models": FakeModels()})())


def test_parse_handles_capability_and_conversation_via_gemini(monkeypatch):
    _mock_gemini_reply(monkeypatch, {
        "intent": "flowtask_help",
        "reply": "I can create tasks, check what's due today or overdue, and answer FlowTask questions.",
    })
    response = client.post("/api/ml/parse", json={"text": "What can you do?"})
    assert response.status_code == 200
    assert response.json()["intent"] == "flowtask_help"
    assert response.json()["reply"]

    _mock_gemini_reply(monkeypatch, {"intent": "conversation", "reply": "Doing great, thanks for asking!"})
    response = client.post("/api/ml/parse", json={"text": "How are you?"})
    assert response.status_code == 200
    assert response.json()["intent"] == "conversation"
    assert response.json()["reply"]


def test_parse_never_returns_create_task_with_empty_title(monkeypatch):
    # Regression test for the "Hi Jerry -> create_task with empty title" bug:
    # even if the model mis-classifies and returns an empty title, the
    # endpoint must convert it to a clarification response, never a task.
    _mock_gemini_reply(monkeypatch, {"intent": "task_create", "title": "", "priority": "medium", "context": "personal"})
    response = client.post("/api/ml/parse", json={"text": "do the thing"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["intent"] == "unclear"
    assert payload["title"] == ""
    assert payload["reply"]


def test_parse_out_of_scope_via_gemini_does_not_create_task(monkeypatch):
    # The improved regex now classifies "Who is..." as out_of_scope directly
    assert main.classify_task_intent("Who is the president of France?") == ("out_of_scope", None)
    response = client.post("/api/ml/parse", json={"text": "Who is the president of France?"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["intent"] == "out_of_scope"
    assert payload["title"] == ""


def test_meeting_fallback_has_summary_assignee_and_deadline(monkeypatch):
    monkeypatch.setattr(main, "client", None)
    transcript = "Alex: I will send the revised report by tomorrow. We decided to launch on Friday."
    response = client.post("/api/ml/analyze-meeting", json={"transcript": transcript})
    assert response.status_code == 200
    payload = response.json()
    assert payload["summary"]
    assert payload["action_items"]
    item = payload["action_items"][0]
    assert item["assignee"] == "Alex"
    assert item["due"].startswith((date.today() + timedelta(days=1)).isoformat())


def test_meeting_gemini_prompt_accepts_literal_json_braces(monkeypatch):
    class FakeModels:
        def generate_content(self, **kwargs):
            return type("Response", (), {"text": '{"summary":"Discussed the launch.","key_notes":[],"action_items":[]}'} )()

    monkeypatch.setattr(main, "client", type("Client", (), {"models": FakeModels()})())
    response = client.post("/api/ml/analyze-meeting", json={"transcript": "The team discussed the launch."})
    assert response.status_code == 200
    assert response.json()["summary"] == "Discussed the launch."


def test_meeting_endpoint_survives_dateparser_exception_on_due_date(monkeypatch):
    # Regression test for a bug where analyze_meeting() re-parsed each
    # action item's already-normalized "due" string with dateparser.parse()
    # a second time, guarded only by `except ImportError`. If dateparser
    # raised any other exception on that second call, it propagated
    # uncaught and turned into an HTTP 500 even though a fully valid
    # AnalyzeMeetingResponse had already been built.
    class FakeModels:
        def generate_content(self, **kwargs):
            return type("Response", (), {"text": json.dumps({
                "summary": "Team planned the launch and assigned follow-ups.",
                "key_notes": [],
                "action_items": [
                    {
                        "task": "Ship the launch checklist",
                        "owner": "Priya",
                        "deadline": "Friday",
                        "priority": "high",
                    }
                ],
            })})()

    monkeypatch.setattr(main, "client", type("Client", (), {"models": FakeModels()})())

    import dateparser

    def boom(*args, **kwargs):
        raise ValueError("simulated dateparser failure")

    monkeypatch.setattr(dateparser, "parse", boom)

    response = client.post(
        "/api/ml/analyze-meeting",
        json={"transcript": "Priya: I will ship the launch checklist by Friday."},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["summary"]
    assert payload["action_items"]


def test_transcript_upload_returns_summary_and_legacy_tasks(monkeypatch):
    monkeypatch.setattr(main, "client", None)
    transcript = b"Priya: I will review the launch checklist by Friday."
    response = client.post(
        "/api/ml/analyze-transcript",
        data={"meeting_title": "Launch review"},
        files={"file": ("meeting.txt", transcript, "text/plain")},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["summary"]
    assert payload["action_items"][0]["assignee"] == "Priya"
    assert payload["tasks"][0]["assignee"] == "Priya"
    assert payload["tasks"][0]["due_date"] == payload["action_items"][0]["due"]


def test_jerry_v2_routes_language_and_modality_without_gemini(monkeypatch):
    monkeypatch.setattr(main, "client", None)
    cases = {
        "Thank you Jerry": "conversation",
        "Move my assignment to Friday.": "task_update",
        "Make the backend task high priority.": "task_update",
        "Mark my assignment as complete.": "task_complete",
        "Delete the grocery task.": "task_delete",
        "What were the action items from today's meeting?": "meeting_action_item_query",
        "What did Rahul agree to do?": "meeting_action_item_query",
        "What are the deadlines from the meeting?": "meeting_action_item_query",
        "Aaj mere tasks kya hain?": "task_query",
        "Kal ki meeting ke action items kya hain?": "meeting_action_item_query",
    }
    for text, intent in cases.items():
        response = client.post("/api/ml/parse", json={"text": text, "input_mode": "voice"})
        assert response.status_code == 200
        payload = response.json()
        assert payload["intent"] == intent
        assert payload["should_speak"] is True
    typed = client.post("/api/ml/parse", json={"text": "What are my tasks today?", "input_mode": "text"}).json()
    assert typed["language"] == "en"
    assert typed["should_speak"] is False


# ---- Jerry V2 comprehensive tests ----


def test_jerry_v2_hindi_greeting(monkeypatch):
    """Hindi/Hinglish greetings must be classified as greeting, not task_create."""
    monkeypatch.setattr(main, "client", None)
    cases = ["Hi Jerry tum kaise ho?", "Jerry kya haal hai?", "Hello Jerry", "Namaste Jerry"]
    for text in cases:
        resp = client.post("/api/ml/parse", json={"text": text})
        assert resp.status_code == 200
        payload = resp.json()
        assert payload["intent"] == "greeting", f"'{text}' should be greeting, got {payload['intent']}"
        assert payload["reply"], f"'{text}' should have a reply"
        assert payload["title"] == ""


def test_jerry_v2_hindi_task_creation(monkeypatch):
    """Hindi/Hinglish task creation must extract title and date."""
    monkeypatch.setattr(main, "client", None)
    cases = [
        ("kal mujhe assignment submit karna hai", "Assignment submit"),
        ("Add a task to call Rahul tomorrow", "Call Rahul"),
        ("Remind me to finish my project by Friday", "Finish my project"),
    ]
    for text, expected_title_substring in cases:
        resp = client.post("/api/ml/parse", json={"text": text})
        assert resp.status_code == 200
        payload = resp.json()
        assert payload["intent"] == "task_create", f"'{text}' should be task_create, got {payload['intent']}"
        assert payload["title"], f"'{text}' should have a title"
        # Title should be clean, not contain filler words
        title = payload["title"]
        assert "jerry" not in title.lower(), f"Title '{title}' should not contain 'jerry'"
        assert "remind me to" not in title.lower(), f"Title '{title}' should not contain 'remind me to'"
        assert "add a task" not in title.lower(), f"Title '{title}' should not contain 'add a task'"


def test_jerry_v2_task_creation_with_time(monkeypatch):
    """Task creation with 'at 5 pm' must preserve the time in due_date."""
    monkeypatch.setattr(main, "client", None)
    resp = client.post("/api/ml/parse", json={"text": "Remind me to submit my assignment tomorrow at 5 PM"})
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["intent"] == "task_create"
    assert payload["title"]
    assert payload["due_date"], "due_date should be set when time is specified"
    # Must contain 17:00 (5 PM), not midnight
    assert "17:00" in payload["due_date"], f"due_date '{payload['due_date']}' should include 17:00, not midnight"


def test_jerry_v2_task_queries_without_gemini(monkeypatch):
    """All task query types must be classified correctly without Gemini."""
    monkeypatch.setattr(main, "client", None)
    cases = {
        "What do I have today?": "today",
        "What tasks are due today?": "today",
        "What do I have to do tomorrow?": "tomorrow",
        "What is overdue?": "overdue",
        "Show overdue tasks.": "overdue",
        "What tasks are pending?": "pending",
        "What tasks are still open?": "pending",
        "What do I need to finish this week?": "this_week",
        "Show my tasks for this week.": "this_week",
        "Do I have anything urgent?": "urgent",
        "What have I completed?": "completed",
        "Show completed tasks.": "completed",
        "What tasks are coming up?": "upcoming",
    }
    for text, query in cases.items():
        resp = client.post("/api/ml/parse", json={"text": text})
        assert resp.status_code == 200, f"'{text}' returned {resp.status_code}"
        payload = resp.json()
        assert payload["intent"] == "task_query", f"'{text}' should be task_query, got {payload['intent']}"
        assert payload["query"] == query, f"'{text}' query should be '{query}', got '{payload['query']}'"


def test_jerry_v2_hindi_task_query(monkeypatch):
    """Hindi task queries must classify correctly."""
    monkeypatch.setattr(main, "client", None)
    cases = {
        "Aaj mere tasks kya hain?": "today",
        "Mera koi task overdue hai kya?": "overdue",
        "Kal ke tasks kya hain?": "tomorrow",
        "Pending tasks dikhao": "pending",
    }
    for text, query in cases.items():
        resp = client.post("/api/ml/parse", json={"text": text})
        assert resp.status_code == 200, f"'{text}' returned {resp.status_code}"
        payload = resp.json()
        assert payload["intent"] == "task_query", f"'{text}' should be task_query, got {payload['intent']}"
        assert payload["query"] == query, f"'{text}' query should be '{query}', got '{payload['query']}'"


def test_jerry_v2_hindi_task_complete_and_delete(monkeypatch):
    """Hindi task mutations must classify correctly."""
    monkeypatch.setattr(main, "client", None)
    cases = {
        "Assignment complete kar do": "task_complete",
        "Report task delete karo": "task_delete",
        "Assignment ka deadline Friday kar do": "task_update",
    }
    for text, intent in cases.items():
        resp = client.post("/api/ml/parse", json={"text": text})
        assert resp.status_code == 200, f"'{text}' returned {resp.status_code}"
        payload = resp.json()
        assert payload["intent"] == intent, f"'{text}' should be {intent}, got {payload['intent']}"


def test_jerry_v2_empty_text_returns_error(monkeypatch):
    """Empty text must return an error, not crash."""
    monkeypatch.setattr(main, "client", None)
    resp = client.post("/api/ml/parse", json={"text": ""})
    assert resp.status_code == 400


def test_jerry_v2_voice_mode_sets_should_speak(monkeypatch):
    """Voice input must set should_speak=True and language detection works."""
    monkeypatch.setattr(main, "client", None)
    resp = client.post("/api/ml/parse", json={"text": "What do I have today?", "input_mode": "voice"})
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["should_speak"] is True
    assert payload["input_mode"] == "voice"
    assert payload["language"] == "en"

    # Hindi voice
    resp = client.post("/api/ml/parse", json={"text": "Aaj mere tasks kya hain?", "input_mode": "voice"})
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["should_speak"] is True
    assert payload["language"] == "hi"


def test_jerry_v2_hindi_language_detection(monkeypatch):
    """Hindi/Hinglish must be detected as language='hi'."""
    monkeypatch.setattr(main, "client", None)
    cases = [
        ("kal mujhe assignment submit karna hai", "hi"),
        ("Aaj mere tasks kya hain?", "hi"),
        ("What do I have today?", "en"),
        ("Remind me to call Rahul", "en"),
    ]
    for text, expected_lang in cases:
        resp = client.post("/api/ml/parse", json={"text": text})
        assert resp.status_code == 200
        assert resp.json()["language"] == expected_lang, f"'{text}' should be '{expected_lang}'"


def test_jerry_v2_meeting_query_variants(monkeypatch):
    """Meeting queries must classify correctly without Gemini."""
    monkeypatch.setattr(main, "client", None)
    cases = {
        "Summarize my last meeting": "meeting_query",
        "What happened in the meeting?": "meeting_query",
        "What were the action items from today's meeting?": "meeting_action_item_query",
        "Who agreed to do what?": "meeting_action_item_query",
    }
    for text, expected in cases.items():
        resp = client.post("/api/ml/parse", json={"text": text})
        assert resp.status_code == 200, f"'{text}' returned {resp.status_code}"
        payload = resp.json()
        assert payload["intent"] == expected, f"'{text}' should be {expected}, got {payload['intent']}"


def test_jerry_v2_unknown_intent_without_gemini(monkeypatch):
    """Ambiguous input without Gemini should fall through to unclear."""
    monkeypatch.setattr(main, "client", None)
    # This input doesn't match any regex pattern, so returns (None, None)
    # When Gemini is unavailable, it should return unclear
    resp = client.post("/api/ml/parse", json={"text": "maybe something"})
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["intent"] == "unclear"
    assert payload["reply"]


def test_jerry_v2_gemini_structured_output(monkeypatch):
    """When Gemini is available, it should return structured JSON with intent."""
    gemini_response = {
        "intent": "task_create",
        "title": "Submit assignment",
        "due_date": "2026-08-27T17:00:00",
        "priority": "medium",
        "context": "study",
        "query": None,
        "reply": None,
        "tags": ["assignment"],
        "recurrence": "none",
        "task_match": None,
        "updates": {},
    }
    _mock_gemini_reply(monkeypatch, gemini_response)
    resp = client.post("/api/ml/parse", json={"text": "kal mujhe assignment submit karna hai 5 baje"})
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["intent"] == "task_create"
    assert payload["title"] == "Submit assignment"
    assert payload["due_date"]
    assert "17:00" in payload["due_date"]


def test_jerry_v2_gemini_hindi_greeting(monkeypatch):
    """Gemini should handle Hindi greetings with natural reply."""
    _mock_gemini_reply(monkeypatch, {
        "intent": "greeting",
        "reply": "Namaste! Main Jerry hoon. FlowTask mein kya karna hai?",
    })
    resp = client.post("/api/ml/parse", json={"text": "Jerry tum kaise ho?"})
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["intent"] == "greeting"
    assert "Namaste" in payload["reply"] or "Jerry" in payload["reply"]


def test_jerry_v2_gemini_hindi_task_create(monkeypatch):
    """Gemini should handle Hindi task creation with proper date/time."""
    _mock_gemini_reply(monkeypatch, {
        "intent": "task_create",
        "title": "Submit assignment",
        "due_date": "2026-08-27T17:00:00",
        "priority": "medium",
        "context": "study",
        "query": None,
        "reply": None,
        "tags": [],
        "recurrence": "none",
        "task_match": None,
        "updates": {},
    })
    resp = client.post("/api/ml/parse", json={"text": "Kal mujhe assignment 5 baje submit karna hai"})
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["intent"] == "task_create"
    assert payload["title"] == "Submit assignment"
    assert "17:00" in payload["due_date"]


def test_jerry_v2_meeting_analysis_v3_version(monkeypatch):
    """ML API version endpoint must report meeting-analysis-v3."""
    resp = client.get("/api/ml/version")
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["version"] == "meeting-analysis-v3"
    assert payload["model"] == "gemini-2.5-flash"
    assert payload["gemini_configured"] in (True, False)


# ---- Jerry V2.1 tests: improved intent routing, fallback, task_match ----


def test_jerry_v21_conversation_not_task(monkeypatch):
    """Conversational phrases must never become tasks."""
    monkeypatch.setattr(main, "client", None)
    cases = [
        "Thanks Jerry",
        "Okay thanks",
        "Great, thanks for that",
        "Awesome",
    ]
    for text in cases:
        resp = client.post("/api/ml/parse", json={"text": text})
        assert resp.status_code == 200
        payload = resp.json()
        assert payload["intent"] == "conversation", f"'{text}' should be conversation, got {payload['intent']}"
        assert payload["title"] == "", f"'{text}' should not have a title"


def test_jerry_v21_hinglish_conversation(monkeypatch):
    """Hinglish small talk must not become tasks."""
    monkeypatch.setattr(main, "client", None)
    cases = [
        "Jerry tum kaise ho?",
        "Kya haal hai?",
        "Hello Jerry",
        "Namaste",
    ]
    for text in cases:
        resp = client.post("/api/ml/parse", json={"text": text})
        assert resp.status_code == 200
        payload = resp.json()
        assert payload["intent"] in ("greeting", "conversation"), f"'{text}' should be greeting/conversation, got {payload['intent']}"
        assert payload["title"] == "", f"'{text}' should not create a task"


def test_jerry_v21_task_match_for_mutation_intents(monkeypatch):
    """Gemini should extract task_match for mutation intents."""
    _mock_gemini_reply(monkeypatch, {
        "intent": "task_complete",
        "task_match": "submit assignment",
        "reply": None,
    })
    resp = client.post("/api/ml/parse", json={"text": "Mark my submit assignment as complete"})
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["intent"] == "task_complete"
    assert payload["task_match"] == "submit assignment"

    _mock_gemini_reply(monkeypatch, {
        "intent": "task_delete",
        "task_match": "grocery shopping",
        "reply": None,
    })
    resp = client.post("/api/ml/parse", json={"text": "Delete my grocery shopping task"})
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["intent"] == "task_delete"
    assert payload["task_match"] == "grocery shopping"

    _mock_gemini_reply(monkeypatch, {
        "intent": "task_update",
        "task_match": "project report",
        "updates": {"priority": "high"},
        "reply": None,
    })
    resp = client.post("/api/ml/parse", json={"text": "Make the project report high priority"})
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["intent"] == "task_update"
    assert payload["task_match"] == "project report"
    assert payload["updates"]["priority"] == "high"


def test_jerry_v21_hindi_task_mutation_with_task_match(monkeypatch):
    """Hindi task mutations should classify and set task_match."""
    _mock_gemini_reply(monkeypatch, {
        "intent": "task_complete",
        "task_match": "assignment",
        "reply": None,
    })
    resp = client.post("/api/ml/parse", json={"text": "Assignment complete kar do"})
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["intent"] == "task_complete"
    assert payload["task_match"] == "assignment"


def test_jerry_v21_out_of_scope_never_task(monkeypatch):
    """Out-of-scope requests must never become tasks."""
    monkeypatch.setattr(main, "client", None)
    # Known out-of-scope patterns
    cases = [
        "Tell me a joke about cats",
        "What is the capital of France?",
    ]
    for text in cases:
        resp = client.post("/api/ml/parse", json={"text": text})
        assert resp.status_code == 200
        payload = resp.json()
        assert payload["intent"] != "task_create", f"'{text}' should NOT be task_create, got {payload['intent']}"
        assert payload["title"] == "", f"'{text}' should not have a title"


def test_jerry_v21_voice_classification_matches_typed(monkeypatch):
    """Voice and typed input must produce the same intent classification."""
    monkeypatch.setattr(main, "client", None)
    cases = [
        "Hi Jerry",
        "What do I have today?",
        "Remind me to call Rahul tomorrow",
        "Mark my assignment complete",
    ]
    for text in cases:
        typed = client.post("/api/ml/parse", json={"text": text, "input_mode": "text"}).json()
        voice = client.post("/api/ml/parse", json={"text": text, "input_mode": "voice"}).json()
        assert typed["intent"] == voice["intent"], f"'{text}' voice/typed mismatch: {voice['intent']} vs {typed['intent']}"
        assert typed["should_speak"] is False
        assert voice["should_speak"] is True


def test_jerry_v21_gemini_quota_fallback(monkeypatch):
    """When Gemini returns 429, fallback must handle clear intents gracefully."""
    class QuotaError(Exception):
        pass

    class FakeQuotaModels:
        def generate_content(self, **kwargs):
            raise QuotaError("429 Resource has been exhausted. Please try again later.")

    monkeypatch.setattr(main, "client", type("Client", (), {"models": FakeQuotaModels()})())

    # Clear intent: greeting (should be handled by regex fallback)
    resp = client.post("/api/ml/parse", json={"text": "Hi Jerry"})
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["intent"] == "greeting"
    assert payload["reply"]

    # Clear intent: task query (should be handled by regex fallback)
    resp = client.post("/api/ml/parse", json={"text": "What do I have today?"})
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["intent"] == "task_query"
    assert payload["query"] == "today"

    # Ambiguous intent (should return unclear with friendly message)
    resp = client.post("/api/ml/parse", json={"text": "something random"})
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["intent"] == "unclear"
    assert payload["reply"]
    assert "busy" in payload["reply"].lower() or "temporarily" in payload["reply"].lower() or "samajh" in payload["reply"].lower()


def test_jerry_v21_follow_up_context_stored(monkeypatch):
    """After task creation, task_match should be set for follow-up updates."""
    _mock_gemini_reply(monkeypatch, {
        "intent": "task_create",
        "title": "Submit assignment",
        "due_date": "2026-08-27",
        "priority": "medium",
        "context": "study",
        "reply": "Done! I've added Submit assignment.",
    })
    resp = client.post("/api/ml/parse", json={"text": "Add a task to submit my assignment tomorrow"})
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["intent"] == "task_create"
    assert payload["title"] == "Submit assignment"
    assert payload["reply"]

    # Now a follow-up update using task_match
    _mock_gemini_reply(monkeypatch, {
        "intent": "task_update",
        "task_match": "submit assignment",
        "updates": {"due_date": "2026-08-29"},
        "reply": None,
    })
    resp = client.post("/api/ml/parse", json={"text": "Change it to Friday"})
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["intent"] == "task_update"
    assert payload["task_match"] == "submit assignment"
    assert payload["updates"]["due_date"] == "2026-08-29"
