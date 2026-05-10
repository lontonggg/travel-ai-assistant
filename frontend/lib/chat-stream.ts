import type { ChatEvent } from "./types";

export function parseEvent(raw: string): ChatEvent | null {
  try {
    const data = JSON.parse(raw.trim());
    if (data && typeof data.type === "string") {
      return data as ChatEvent;
    }
    return null;
  } catch {
    return null;
  }
}
