const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function* streamChat(
  message: string,
  sessionId: string | null,
  detectedOrigin?: { code: string; city: string } | null
): AsyncGenerator<string, void, unknown> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      session_id: sessionId,
      detected_origin: detectedOrigin ?? null,
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`Chat request failed: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        yield line.slice(6);
      }
    }
  }

  // flush remaining
  if (buffer.startsWith("data: ")) {
    yield buffer.slice(6);
  }
}

export function getSessionId(): string {
  if (typeof window === "undefined") return crypto.randomUUID();
  let id = sessionStorage.getItem("flighthub_session_id");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("flighthub_session_id", id);
  }
  return id;
}
