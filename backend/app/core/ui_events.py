from typing import Any, Optional
import json


def agent_status_event(agent: str, state: str, tool: Optional[str] = None) -> str:
    data = {"type": "agent_status", "agent": agent, "state": state, "tool": tool}
    return f"data: {json.dumps(data)}\n\n"


def text_delta_event(delta: str) -> str:
    data = {"type": "text_delta", "delta": delta}
    return f"data: {json.dumps(data)}\n\n"


def ui_component_event(kind: str, props: Any, message_id: str) -> str:
    data = {"type": "ui_component", "kind": kind, "props": props, "message_id": message_id}
    return f"data: {json.dumps(data)}\n\n"


def phase_event(phase: str, step: int, total: int, label: str) -> str:
    data = {"type": "phase", "phase": phase, "step": step, "total": total, "label": label}
    return f"data: {json.dumps(data)}\n\n"


def done_event() -> str:
    return 'data: {"type": "done"}\n\n'


def error_event(message: str) -> str:
    data = {"type": "error", "message": message}
    return f"data: {json.dumps(data)}\n\n"
