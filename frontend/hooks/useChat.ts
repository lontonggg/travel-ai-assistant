"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSessionId, streamChat } from "@/lib/api";
import { parseEvent } from "@/lib/chat-stream";
import { detectNearestAirport, type Airport } from "@/lib/geolocation";
import type { AgentStatus, Message, UiComponentEvent } from "@/lib/types";

const MESSAGES_KEY = "flighthub_messages";

function loadMessages(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MESSAGES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [latestAssistantId, setLatestAssistantId] = useState<string | null>(null);
  const sessionId = useRef<string | null>(null);
  const detectedOrigin = useRef<Airport | null>(null);

  useEffect(() => {
    detectNearestAirport().then((airport) => {
      detectedOrigin.current = airport;
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
  }, [messages]);

  const getOrCreateSessionId = () => {
    if (!sessionId.current) {
      sessionId.current = getSessionId();
    }
    return sessionId.current;
  };

  const sendMessage = useCallback(async (text: string) => {
    const sid = getOrCreateSessionId();

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      text,
    };
    setMessages((prev) => [...prev, userMsg]);

    const assistantId = crypto.randomUUID();
    const assistantMsg: Message = {
      id: assistantId,
      role: "assistant",
      text: "",
      uiComponents: [],
    };
    setMessages((prev) => [...prev, assistantMsg]);
    setLatestAssistantId(assistantId);
    setIsStreaming(true);
    setAgentStatus(null);

    const pendingUi: UiComponentEvent[] = [];

    const flushUi = () => {
      if (pendingUi.length === 0) return;
      const snapshot = [...pendingUi];
      pendingUi.length = 0;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, uiComponents: [...(m.uiComponents ?? []), ...snapshot] }
            : m
        )
      );
    };

    try {
      for await (const raw of streamChat(text, sid, detectedOrigin.current)) {
        const event = parseEvent(raw);
        if (!event) continue;

        switch (event.type) {
          case "agent_status":
            if (event.state === "done") {
              setAgentStatus(null);
            } else {
              setAgentStatus({ agent: event.agent, state: event.state, tool: event.tool });
            }
            break;

          case "text_delta":
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, text: (m.text ?? "") + event.delta }
                  : m
              )
            );
            break;

          case "ui_component":
            // Buffer — text must appear before the component
            pendingUi.push(event as UiComponentEvent);
            break;

          case "error":
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, text: (m.text ?? "") + `\n\nError: ${event.message}` }
                  : m
              )
            );
            break;

          case "done":
            // Flush as soon as backend signals done — don't wait for TCP close
            flushUi();
            break;
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, text: (m.text || "Sorry, something went wrong. Please try again.") }
            : m
        )
      );
    } finally {
      // Safety net: flush anything that arrived without a done event
      flushUi();
      setIsStreaming(false);
      setAgentStatus(null);
    }
  }, []);

  const resetSession = useCallback(() => {
    sessionId.current = null;
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("flighthub_session_id");
      localStorage.removeItem(MESSAGES_KEY);
    }
    setMessages([]);
    setAgentStatus(null);
    setIsStreaming(false);
    setLatestAssistantId(null);
  }, []);

  return { messages, agentStatus, isStreaming, latestAssistantId, sendMessage, resetSession };
}
