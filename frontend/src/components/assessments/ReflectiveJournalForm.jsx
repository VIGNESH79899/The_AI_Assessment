import React from "react";
import { User, Calendar, GraduationCap, BookOpen, Sparkles, Loader2 } from "lucide-react";

export function ReflectiveJournalForm({ 
  formData, 
  setFormData, 
  onSubmit, 
  generating, 
  isAiServiceReady = false, 
  isCheckingReady = true 
}) {
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Student Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Student Name</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-650">
              <User className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="e.g., Vignesh Kumar"
              required
              value={formData.student_name || ""}
              onChange={(e) => handleChange("student_name", e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all text-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>

        {/* Registration Number */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Registration Number</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-650">
              <Calendar className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="e.g., 241U1R2089"
              required
              value={formData.registration_number || ""}
              onChange={(e) => handleChange("registration_number", e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650 transition-all text-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>

        {/* Academic Year */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Academic Year</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-650">
              <GraduationCap className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="e.g., 2025 - 2026"
              required
              value={formData.academic_year || ""}
              onChange={(e) => handleChange("academic_year", e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650 transition-all text-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>

        {/* Year & Semester */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Year & Semester</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-650">
              <Calendar className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="e.g., 2nd Year, III Sem"
              required
              value={formData.year_term || ""}
              onChange={(e) => handleChange("year_term", e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650 transition-all text-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>

        {/* Study Level */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Study Level</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-650">
              <GraduationCap className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="e.g., UG / PG"
              required
              value={formData.study_level || ""}
              onChange={(e) => handleChange("study_level", e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650 transition-all text-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>

        {/* Class & Section */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Class & Section</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-650">
              <User className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="e.g., A / B"
              required
              value={formData.class_section || ""}
              onChange={(e) => handleChange("class_section", e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650 transition-all text-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>

        {/* Subject (Course Name) */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Subject (Course Name)</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-650">
              <BookOpen className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="e.g., Artificial Intelligence"
              required
              value={formData.course_name || ""}
              onChange={(e) => handleChange("course_name", e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650 transition-all text-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>

        {/* Instructor */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Instructor Name</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-650">
              <User className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="e.g., Prof. Smith"
              required
              value={formData.instructor || ""}
              onChange={(e) => handleChange("instructor", e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650 transition-all text-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>

        {/* Topic */}
        <div className="sm:col-span-2 space-y-1.5">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Module / Topic</label>
          <textarea
            placeholder="e.g., The transformative power of Neural Networks in grading academic essays..."
            required
            value={formData.topic || ""}
            onChange={(e) => handleChange("topic", e.target.value)}
            className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650 transition-all min-h-[80px] text-zinc-900 dark:text-zinc-100"
          />
        </div>

        {/* Document Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Document File Name</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-650">
              <BookOpen className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="e.g., Journal_01_AI"
              required
              value={formData.document_name || ""}
              onChange={(e) => handleChange("document_name", e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650 transition-all text-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>

        {/* Date Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Date of Submission</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-650">
              <Calendar className="w-4 h-4" />
            </span>
            <input
              type="date"
              required
              value={formData.date || ""}
              onChange={(e) => handleChange("date", e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650 transition-all text-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>

        {/* Additional Instructions */}
        <div className="sm:col-span-2 space-y-1.5">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <span>Additional Instructions</span>
            <span className="text-[10px] text-zinc-400">(Optional)</span>
          </label>
          <textarea
            placeholder="e.g., Highlight ethical aspects, focus on computational limitations, keep sections detailed..."
            value={formData.additional_instructions || ""}
            onChange={(e) => handleChange("additional_instructions", e.target.value)}
            className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650 transition-all min-h-[80px] text-zinc-900 dark:text-zinc-100"
          />
        </div>
      </div>

      <div className="border-t border-zinc-100 dark:border-zinc-800 pt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {isCheckingReady ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
              <span className="text-xs text-zinc-400 dark:text-zinc-500">Checking AI Engine status...</span>
            </>
          ) : isAiServiceReady ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">FastAPI backend queue is ready.</span>
            </>
          ) : (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
              <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">AI Engine is waking up (may take 1-2 mins)...</span>
            </>
          )}
        </div>
        <button
          type="submit"
          disabled={generating || !isAiServiceReady || isCheckingReady}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-zinc-950 dark:bg-zinc-50 dark:text-zinc-950 text-white rounded-xl text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating Journal...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Generate Reflective Journal</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
