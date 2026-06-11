"use client";

import { useEffect, useRef, useState } from "react";
import { useChatContext } from "@/contexts/ChatContext";
import MessageBubble from "./MessageBubble";
import AgentStatus from "./AgentStatus";
import TypingIndicator from "./TypingIndicator";
import { Send } from "lucide-react";

const SUGGESTIONS = [
  "I want a beach getaway on a budget",
  "Suggest a great food destination for me",
  "Show me affordable flights to North America",
  "What's a good adventure trip for 2 people?",
];

export default function ChatWindow() {
  const { messages, agentStatus, isStreaming, latestAssistantId, sendMessage } = useChatContext();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, agentStatus, isStreaming]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5 scrollbar-thin">
          {isEmpty && (
            <div className="flex flex-col items-center justify-center h-full gap-4 px-4">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">✈️</span>
                </div>
                <h2 className="text-sm font-semibold text-gray-900">Your AI travel buddy</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Smart trips, better prices, instant bookings
                </p>
              </div>
              <div className="flex flex-col gap-1.5 w-full">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-left px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-700 hover:border-accent hover:text-accent hover:bg-accent/5 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => {
            const hasContent =
              (msg.text && msg.text.trim().length > 0) ||
              (msg.uiComponents && msg.uiComponents.length > 0);
            if (!hasContent) return null;
            return <MessageBubble key={msg.id} message={msg} isLatest={msg.id === latestAssistantId} />;
          })}

          <AgentStatus status={agentStatus} />

          {isStreaming && messages[messages.length - 1]?.role === "user" && (
            <TypingIndicator />
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 p-3 flex-shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message…"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all leading-relaxed"
              style={{ maxHeight: 80 }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="w-8 h-8 rounded-xl bg-accent text-white flex items-center justify-center hover:bg-accent-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
  );
}
