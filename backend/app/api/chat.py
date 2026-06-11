import json
import re
import uuid
from datetime import date, timedelta
from typing import AsyncGenerator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from google.adk.runners import Runner
from google.adk.sessions import DatabaseSessionService
from google.genai.types import Content, Part
from pydantic import BaseModel

from app.agents.flow import compute_phase, progress_info
from app.agents.root_agent import root_agent
from app.core.config import settings
from app.core.ui_events import (
    agent_status_event,
    done_event,
    error_event,
    phase_event,
    text_delta_event,
    ui_component_event,
)

router = APIRouter()

session_service = DatabaseSessionService(db_url=settings.DATABASE_URL)
APP_NAME = "flighthub_booking"


class DetectedOrigin(BaseModel):
    code: str
    city: str


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None
    tool_response: dict | None = None
    detected_origin: DetectedOrigin | None = None


_INTERNAL_LOG_PATTERNS = re.compile(
    r"(For context:.*?(?=\n\n|\Z)|"
    r"\[[\w_]+\] called tool.*?(?=\n\n|\Z)|"
    r"\[[\w_]+\] \w+ tool returned.*?(?=\n\n|\Z)|"
    r"\[System context[^\]]*\].*?(?=\n\n|\Z))",
    re.DOTALL | re.MULTILINE,
)


def _strip_internal_logs(text: str) -> str:
    return _INTERNAL_LOG_PATTERNS.sub("", text).strip()


def _build_message(message: str, detected_origin: DetectedOrigin | None) -> str:
    today = date.today()
    tomorrow = today + timedelta(days=1)
    # Find next Friday
    days_until_friday = (4 - today.weekday()) % 7 or 7
    next_friday = today + timedelta(days=days_until_friday)

    date_context = (
        f"Today is {today.strftime('%A, %Y-%m-%d')}. "
        f"Tomorrow is {tomorrow.strftime('%A, %Y-%m-%d')}. "
        f"Next Friday is {next_friday.strftime('%Y-%m-%d')}."
    )

    location_context = ""
    if detected_origin:
        location_context = (
            f" The user's device is near {detected_origin.city} ({detected_origin.code}). "
            f"If they have not specified a departure city, assume they are departing from "
            f"{detected_origin.city} ({detected_origin.code}) without asking — "
            f"just mention it naturally (e.g. 'from {detected_origin.city}') so they can correct you if it's wrong."
        )

    return (
        f"[System context — do not repeat verbatim: {date_context}{location_context}]\n\n"
        f"{message}"
    )


def _extract_ui(response) -> dict | None:
    """Extract the UI payload from an ADK FunctionResponse, handling all known formats."""
    try:
        raw = response.response

        # Some ADK versions serialize the response as a JSON string
        if isinstance(raw, str):
            try:
                raw = json.loads(raw)
            except (json.JSONDecodeError, TypeError):
                return None

        if not isinstance(raw, dict):
            return None

        # Direct format: {"result": ..., "ui": {...}}
        if "ui" in raw:
            return raw["ui"]

        # ADK-wrapped format: {"output": {"result": ..., "ui": {...}}}
        output = raw.get("output")
        if isinstance(output, dict) and "ui" in output:
            return output["ui"]

        # JSON-string inside output key
        if isinstance(output, str):
            try:
                parsed = json.loads(output)
                if isinstance(parsed, dict) and "ui" in parsed:
                    return parsed["ui"]
            except (json.JSONDecodeError, TypeError):
                pass

    except Exception:
        pass

    return None


async def stream_agent_response(
    message: str, session_id: str
) -> AsyncGenerator[str, None]:
    try:
        runner = Runner(
            agent=root_agent,
            app_name=APP_NAME,
            session_service=session_service,
        )

        session = await session_service.get_session(
            app_name=APP_NAME, user_id="user", session_id=session_id
        )
        if session is None:
            session = await session_service.create_session(
                app_name=APP_NAME, user_id="user", session_id=session_id
            )

        user_content = Content(role="user", parts=[Part(text=message)])

        async for event in runner.run_async(
            user_id="user",
            session_id=session_id,
            new_message=user_content,
        ):
            # Agent transfer events
            if hasattr(event, "author") and event.author:
                agent_name = event.author
                if agent_name != "root_agent":
                    yield agent_status_event(agent_name, "thinking")

            # Tool call events
            if hasattr(event, "get_function_calls") and callable(event.get_function_calls):
                calls = event.get_function_calls()
                if calls:
                    for call in calls:
                        agent_name = getattr(event, "author", "root_agent") or "root_agent"
                        tool_name = call.name
                        # Resolve transfer calls to target-specific names
                        if call.name == "transfer_to_agent":
                            args = getattr(call, "args", {}) or {}
                            target = args.get("agent_name", "")
                            tool_name = f"transfer_to_{target}" if target else "transfer_to_agent"
                        yield agent_status_event(agent_name, "calling_tool", tool_name)

            # Tool response / UI component events
            if hasattr(event, "get_function_responses") and callable(event.get_function_responses):
                responses = event.get_function_responses()
                if responses:
                    for response in responses:
                        ui = _extract_ui(response)
                        if ui:
                            yield ui_component_event(
                                kind=ui["kind"],
                                props=ui.get("props", {}),
                                message_id=str(uuid.uuid4()),
                            )

            # Text delta events
            if event.is_final_response():
                if event.content and event.content.parts:
                    for part in event.content.parts:
                        if hasattr(part, "text") and part.text:
                            text = _strip_internal_logs(part.text)
                            if not text.strip():
                                continue
                            chunk_size = 20
                            for i in range(0, len(text), chunk_size):
                                yield text_delta_event(text[i : i + chunk_size])

                agent_name = getattr(event, "author", "root_agent") or "root_agent"
                yield agent_status_event(agent_name, "done")

        session = await session_service.get_session(
            app_name=APP_NAME, user_id="user", session_id=session_id
        )
        if session is not None:
            state = session.state
            phase = compute_phase(state)
            progress = progress_info(phase, state)
            yield phase_event(phase.value, progress["step"], progress["total"], progress["label"])

        yield done_event()

    except Exception as e:
        yield error_event(str(e))
        yield done_event()


@router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    session_id = request.session_id or str(uuid.uuid4())
    message = _build_message(request.message, request.detected_origin)

    return StreamingResponse(
        stream_agent_response(message, session_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Session-Id": session_id,
        },
    )
