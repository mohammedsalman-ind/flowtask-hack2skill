from datetime import date

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from workspace_ai import Analysis, MeetingSource, authorize, deadline_date, grounded_analysis


def test_deadlines_use_the_meeting_date_and_leave_uncertain_text_unresolved():
    monday = date(2026, 11, 16)
    assert deadline_date("by Friday", monday) == "2026-11-20"
    assert deadline_date("tomorrow", monday) == "2026-11-17"
    assert deadline_date("Monday", monday) == "2026-11-16"
    assert deadline_date("by next week", monday) is None
    assert deadline_date("2026-02-29", monday) is None


def test_grounding_rejects_invented_fields_and_discards_duplicate_drafts():
    source = MeetingSource(title="Planning", transcript="Salman will finish frontend by Friday.", meeting_date=date(2026, 11, 16))
    action = {
        "title": "Finish frontend", "description": "", "evidence": source.transcript,
        "assignee_text": "Someone else", "deadline_text": "Friday", "priority": "high", "priority_evidence": "ASAP",
    }
    response = Analysis.model_validate({
        "overview": "Frontend planning", "discussion": [], "blockers": [], "next_steps": [],
        "decisions": [{"text": "Backend approved", "evidence": "We approved the backend."}],
        "action_items": [action, action, {**action, "evidence": "Made-up quote"}],
    })
    grounded = grounded_analysis(response, source)
    assert grounded["decisions"] == []
    assert len(grounded["action_items"]) == 1
    assert grounded["action_items"][0]["suggested_due_day"] == "2026-11-20"
    assert grounded["action_items"][0]["assignee_text"] is None
    assert grounded["action_items"][0]["priority"] is None


def test_workspace_ai_rejects_missing_auth_and_invalid_model_data(monkeypatch):
    monkeypatch.setenv("ORG_AI_SHARED_SECRET", "server-only-test-secret")
    with pytest.raises(HTTPException) as failure:
        authorize("incorrect")
    assert failure.value.status_code == 403
    authorize("server-only-test-secret")
    with pytest.raises(ValidationError):
        Analysis.model_validate({"overview": "Incomplete model response"})
