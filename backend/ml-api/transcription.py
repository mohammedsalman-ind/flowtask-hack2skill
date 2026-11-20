"""
Meeting audio transcription service.

Uses Gemini 2.5 Flash for speech-to-text with speaker diarization.
Reuses the existing Gemini client and GEMINI_API_KEY configured in main.py.

Environment variables:
  GEMINI_API_KEY — required (already configured for Jerry / meeting analysis)
"""

import os
import asyncio
import tempfile
from google import genai
from google.genai import types


# ---------------------------------------------------------------------------
# Gemini client — initialised lazily so transcription.py can import cleanly
# ---------------------------------------------------------------------------
_client: genai.Client | None = None


def _get_client() -> genai.Client | None:
    global _client
    if _client is not None:
        return _client
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    try:
        _client = genai.Client(api_key=api_key)
    except Exception as exc:
        print(f"[Transcription] Failed to init Gemini client: {exc}")
        _client = None
    return _client


# ---------------------------------------------------------------------------
# Public API — same contract as the previous transcription implementation
# ---------------------------------------------------------------------------

async def transcribe_audio(
    audio_bytes: bytes,
    filename: str,
    mime_type: str = "audio/m4a",
) -> dict:
    """
    Transcribe audio bytes using Gemini 2.5 Flash.

    Returns:
        {
            "text": "full transcript text...",
            "success": True,
            "error": None
        }

    On failure:
        {
            "text": "",
            "success": False,
            "error": "human-readable error message"
        }
    """
    client = _get_client()
    if not client:
        return {
            "text": "",
            "success": False,
            "error": (
                "Transcription service is not configured. "
                "Please paste your meeting notes manually."
            ),
        }

    if not audio_bytes or len(audio_bytes) < 100:
        return {
            "text": "",
            "success": False,
            "error": "The recording appears to be empty or too short to transcribe.",
        }

    # Gemini audio input limit: ~25 MB inline, ~2 GB via File API.
    # For most phone recordings inline is fine; fall back to File API for large files.
    INLINE_LIMIT = 20 * 1024 * 1024  # 20 MB

    tmp_path = None
    try:
        if len(audio_bytes) <= INLINE_LIMIT:
            transcript = await _transcribe_inline(client, audio_bytes, mime_type)
        else:
            transcript = await _transcribe_via_file_api(client, audio_bytes, filename, mime_type)

        if not transcript:
            return {
                "text": "",
                "success": False,
                "error": "The recording produced no transcribed text. It may be silent or unclear.",
            }
        return {"text": transcript, "success": True, "error": None}

    except Exception as exc:
        error_str = str(exc).lower()

        if any(k in error_str for k in ("429", "resource_exhausted", "rate", "quota", "too many")):
            print("[Transcription] Gemini quota exhausted (429)")
            return {
                "text": "",
                "success": False,
                "error": "Transcription service is busy. Please try again in a moment.",
            }
        if any(k in error_str for k in ("401", "unauthorized", "api key", "authentication")):
            print("[Transcription] Gemini authentication error")
            return {
                "text": "",
                "success": False,
                "error": "Transcription service authentication failed. Please check the API configuration.",
            }
        if "timeout" in error_str or "deadline" in error_str:
            print("[Transcription] Gemini timeout")
            return {
                "text": "",
                "success": False,
                "error": "Transcription timed out. The recording may be too long. Try a shorter recording.",
            }
        if any(k in error_str for k in ("file", "size", "limit", "too large", "payload")):
            print("[Transcription] File too large for Gemini")
            return {
                "text": "",
                "success": False,
                "error": "The recording is too large. Please try a shorter recording or upload a transcript file.",
            }

        print(f"[Transcription] Unexpected error: {exc}")
        return {
            "text": "",
            "success": False,
            "error": "Couldn't transcribe this recording. Please try again or upload a transcript file.",
        }


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

TRANSCRIPTION_PROMPT = (
    "Transcribe this meeting audio verbatim. "
    "Label each speaker turn with [spk_1], [spk_2], etc. "
    "Detect the language automatically. "
    "Preserve all spoken content faithfully — do not summarise. "
    "If speakers introduce themselves, note their names in parentheses "
    "on their first turn, e.g. [spk_1] (Somya): ..."
)


def _build_config() -> types.GenerateContentConfig:
    return types.GenerateContentConfig(
        temperature=0.1,
        max_output_tokens=8192,
    )


async def _transcribe_inline(
    client: genai.Client,
    audio_bytes: bytes,
    mime_type: str,
) -> str:
    """Send audio inline as a base64 blob."""
    parts = [
        types.Part(inline_data=types.Blob(mime_type=mime_type, data=audio_bytes)),
        TRANSCRIPTION_PROMPT,
    ]
    # generate_content is sync — run in a thread to keep FastAPI async
    response = await asyncio.to_thread(
        client.models.generate_content,
        model="gemini-2.5-flash",
        contents=parts,
        config=_build_config(),
    )
    return (response.text or "").strip()


async def _transcribe_via_file_api(
    client: genai.Client,
    audio_bytes: bytes,
    filename: str,
    mime_type: str,
) -> str:
    """Upload audio via Gemini File API, then transcribe."""
    # Write to temp file for upload
    ext = _ext_from_mime(mime_type)
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        uploaded = await asyncio.to_thread(
            client.files.upload,
            file=tmp_path,
            config=types.UploadFileConfig(mime_type=mime_type, display_name=filename),
        )
        # Wait for processing
        import time
        for _ in range(60):  # max 60s wait
            state = await asyncio.to_thread(client.files.get, name=uploaded.name)
            if state.state and state.state.name == "ACTIVE":
                break
            if state.state and state.state.name in ("FAILED", "STATE_UNSPECIFIED"):
                raise RuntimeError("Gemini file processing failed")
            await asyncio.sleep(1)

        parts = [types.Part(file_data=types.FileData(file_name=uploaded.name)), TRANSCRIPTION_PROMPT]
        response = await asyncio.to_thread(
            client.models.generate_content,
            model="gemini-2.5-flash",
            contents=parts,
            config=_build_config(),
        )
        return (response.text or "").strip()
    finally:
        # Clean up
        try:
            if tmp_path:
                os.unlink(tmp_path)
        except OSError:
            pass


def _ext_from_mime(mime_type: str) -> str:
    ext_map = {
        "audio/m4a": ".m4a",
        "audio/mp4": ".m4a",
        "audio/x-m4a": ".m4a",
        "audio/aac": ".m4a",
        "audio/wav": ".wav",
        "audio/x-wav": ".wav",
        "audio/webm": ".webm",
        "audio/ogg": ".ogg",
        "audio/mpeg": ".mp3",
        "audio/mp3": ".mp3",
    }
    return ext_map.get(mime_type, ".m4a")
