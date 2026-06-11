"use client";

import type { Phase } from "@/hooks/useChat";

export default function ProgressTracker({ phase }: { phase: Phase | null }) {
  if (!phase || phase.total <= 1) return null;

  const pct = Math.round((phase.step / phase.total) * 100);

  return (
    <div className="px-4 py-1.5 border-b border-gray-100 bg-gray-50/60 flex-shrink-0">
      <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
        <span className="font-medium text-gray-700">{phase.label}</span>
        <span>
          Step {phase.step} of {phase.total}
        </span>
      </div>
      <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
