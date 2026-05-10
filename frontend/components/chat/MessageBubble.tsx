"use client";

import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import type { Message } from "@/lib/types";
import ToolMessage from "./ToolMessage";

export default function MessageBubble({ message, isLatest = true }: { message: Message; isLatest?: boolean }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-1.5"
    >
      {/* Text bubble — constrained width with avatar */}
      {message.text && (
        <div className={`flex gap-1.5 px-3 ${isUser ? "justify-end" : "items-end"}`}>
          {!isUser && (
            <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mb-1">
              T
            </div>
          )}
          <div
            className={`max-w-[82%] text-xs leading-relaxed ${
              isUser
                ? "bg-accent text-white px-3 py-2 rounded-2xl rounded-tr-sm"
                : "bg-gray-100 text-gray-900 px-3 py-2 rounded-2xl rounded-bl-sm"
            }`}
          >
            {isUser ? (
              message.text
            ) : (
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  ul: ({ children }) => <ul className="list-disc pl-3 my-1 space-y-0.5">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-3 my-1 space-y-0.5">{children}</ol>,
                  li: ({ children }) => <li>{children}</li>,
                  code: ({ children }) => (
                    <code className="bg-gray-200 rounded px-1 py-0.5 text-[10px] font-mono">{children}</code>
                  ),
                  a: ({ href, children }) => (
                    <a href={href} className="underline text-accent" target="_blank" rel="noreferrer">
                      {children}
                    </a>
                  ),
                }}
              >
                {message.text}
              </ReactMarkdown>
            )}
          </div>
        </div>
      )}

      {/* UI components — full width, animated in after text */}
      {message.uiComponents && message.uiComponents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="px-3 flex flex-col gap-2"
        >
          {message.uiComponents.map((ev) => (
            <ToolMessage key={ev.message_id} event={ev} disabled={!isLatest} />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
