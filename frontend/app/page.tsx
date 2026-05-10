"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2, Minimize2, MoreVertical, RotateCcw, Download, Bot } from "lucide-react";
import ChatWindow from "@/components/chat/ChatWindow";
import { ChatContext } from "@/contexts/ChatContext";
import { useChat } from "@/hooks/useChat";
import type { Message } from "@/lib/types";

function exportChatAsTxt(messages: Message[]) {
  const lines = messages
    .filter((m) => (m.text && m.text.trim()) || (m.uiComponents && m.uiComponents.length > 0))
    .map((m) => {
      const role = m.role === "user" ? "User" : "Assistant";
      const text = m.text?.trim() || "";
      const uiSummary =
        m.uiComponents && m.uiComponents.length > 0
          ? `\n[UI: ${m.uiComponents.map((u) => u.kind).join(", ")}]`
          : "";
      return `${role}:\n${text}${uiSummary}`;
    })
    .join("\n\n---\n\n");

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const blob = new Blob([`FlightHub — Chat Export\n${new Date().toLocaleString()}\n\n${lines}\n`], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `flighthub-chat-${stamp}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function HomePage() {
  const [maximized, setMaximized] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmRestartOpen, setConfirmRestartOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const chat = useChat();

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleNewSession = () => {
    setMenuOpen(false);
    setConfirmRestartOpen(true);
  };

  const confirmNewSession = () => {
    setConfirmRestartOpen(false);
    chat.resetSession();
  };

  const handleExport = () => {
    setMenuOpen(false);
    exportChatAsTxt(chat.messages);
  };

  return (
    <ChatContext.Provider value={chat}>
      <main className="fixed inset-0 bg-gray-100 flex items-center justify-center p-4">
        <motion.div
          layout
          animate={{ width: maximized ? 600 : 400 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-white rounded-2xl shadow-2xl flex flex-col border border-gray-200"
          style={{
            height: maximized ? "min(820px, calc(100vh - 32px))" : "min(640px, calc(100vh - 32px))",
            maxHeight: "calc(100vh - 32px)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-accent border-b border-accent-dark flex-shrink-0 relative">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white leading-none">FlightHub</div>
              <div className="text-xs text-white/70 mt-0.5">AI Flight Assistant</div>
            </div>

            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => setMaximized((v) => !v)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                title={maximized ? "Shrink" : "Expand"}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={maximized ? "min" : "max"}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ duration: 0.15 }}
                  >
                    {maximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </motion.span>
                </AnimatePresence>
              </button>

              <div ref={menuRef} className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                  title="More options"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>

                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.96 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50 overflow-hidden"
                    >
                      <button
                        onClick={handleNewSession}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                        New session
                      </button>
                      <button
                        onClick={handleExport}
                        disabled={chat.messages.length === 0}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 text-gray-500" />
                        Export chat (.txt)
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Chat */}
          <div className="flex-1 flex flex-col min-h-0">
            <ChatWindow />
          </div>
        </motion.div>

        <AnimatePresence>
          {confirmRestartOpen && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmRestartOpen(false)}
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="restart-session-title"
                aria-describedby="restart-session-description"
                className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl border border-gray-200"
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                onClick={(e) => e.stopPropagation()}
              >
                <h2 id="restart-session-title" className="text-sm font-semibold text-gray-900">
                  Restart session?
                </h2>
                <p id="restart-session-description" className="mt-2 text-xs leading-relaxed text-gray-600">
                  This will clear the current chat and start a new conversation.
                </p>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmRestartOpen(false)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmNewSession}
                    className="rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent-dark transition-colors"
                  >
                    Restart
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </ChatContext.Provider>
  );
}
