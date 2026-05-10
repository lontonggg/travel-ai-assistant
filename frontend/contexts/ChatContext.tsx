"use client";

import { createContext, useContext } from "react";
import type { AgentStatus, Message } from "@/lib/types";

type ChatContextValue = {
  messages: Message[];
  agentStatus: AgentStatus;
  isStreaming: boolean;
  latestAssistantId: string | null;
  sendMessage: (text: string) => void;
  resetSession: () => void;
};

export const ChatContext = createContext<ChatContextValue>({
  messages: [],
  agentStatus: null,
  isStreaming: false,
  latestAssistantId: null,
  sendMessage: () => {},
  resetSession: () => {},
});

export const useChatContext = () => useContext(ChatContext);
