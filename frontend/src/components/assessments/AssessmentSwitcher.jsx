import React from "react";

export function AssessmentSwitcher({ assessmentType, setAssessmentType }) {
  return (
    <div className="grid grid-cols-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl p-1 max-w-md">
      <button
        type="button"
        onClick={() => setAssessmentType("reflective_journal")}
        className={`py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
          assessmentType === "reflective_journal"
            ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-950 dark:text-white border border-zinc-250/20"
            : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-200"
        }`}
      >
        Reflective Journal
      </button>
      <button
        type="button"
        onClick={() => setAssessmentType("free_writing")}
        className={`py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
          assessmentType === "free_writing"
            ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-950 dark:text-white border border-zinc-250/20"
            : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-200"
        }`}
      >
        Free Writing Assessment
      </button>
    </div>
  );
}
