"use client";

import { motion } from "framer-motion";

export default function TypingIndicator() {
  return (
    <div className="flex items-end gap-1.5 px-3">
      <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
        T
      </div>
      <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-3 py-2 flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 bg-gray-400 rounded-full block"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  );
}
