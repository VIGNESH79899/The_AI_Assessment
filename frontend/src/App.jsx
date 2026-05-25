import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BrainCircuit,
  Moon,
  Sun,
  ArrowRight,
  LogIn,
  LogOut,
  Download,
  Trash2,
  RefreshCw,
  FileText,
  ChevronRight,
  User,
  Key,
  Mail,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Calendar,
  GraduationCap,
  BookOpen,
  Layers,
  Sparkle
} from "lucide-react";
import { useTheme } from "./hooks/useTheme.js";
import { AssessmentSwitcher } from "./components/assessments/AssessmentSwitcher.jsx";
import { ReflectiveJournalForm } from "./components/assessments/ReflectiveJournalForm.jsx";
import { FreeWritingForm } from "./components/assessments/FreeWritingForm.jsx";
import { LiteratureSurveyForm } from "./components/assessments/LiteratureSurveyForm.jsx";

const API_URL = import.meta.env.VITE_API_URL || "";

// Reusable apiRequest utility
async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || data.detail || "Request failed");
    error.status = response.status;
    throw error;
  }
  return data;
}

// Fade up animation properties
const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
};

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [activeView, setActiveView] = useState("home");
  
  // Auth state
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  
  // History state
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Dashboard generate form state
  const [assessmentType, setAssessmentType] = useState("reflective_journal");
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [selectedPapers, setSelectedPapers] = useState([]);
  
  const [formData, setFormData] = useState({
    student_name: "",
    registration_number: "",
    academic_year: new Date().getFullYear() + " - " + (new Date().getFullYear() + 1),
    year_term: "",
    study_level: "",
    class_section: "",
    instructor: "",
    document_name: "",
    course_name: "",
    academic_domain: "Computer Science & IT",
    topic: "",
    additional_instructions: "",
    date: new Date().toISOString().slice(0, 10),
    students: [{ name: "", roll: "" }],
    university_name: "Aurora's PG College",
    department_name: "Department of Computer Science & Engineering",
    university_location: "Hyderabad, Telangana",
    guide_name: "",
    guide_designation: "Assistant Professor",
    guide_department: "Computer Science & Engineering"
  });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 4000);
  };

  // Fetch user profile on mount
  const fetchUserProfile = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setUser(null);
      setLoadingUser(false);
      return;
    }
    try {
      const data = await apiRequest("/api/auth/me");
      if (data.user) {
        setUser(data.user);
        fetchHistory();
      }
    } catch (err) {
      console.error("Auth profile fetch failed:", err);
      localStorage.removeItem("accessToken");
      setUser(null);
    } finally {
      setLoadingUser(false);
    }
  };

  // Fetch past generated document history
  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const data = await apiRequest("/api/generator/history");
      setHistory(data.history || []);
    } catch (err) {
      console.error("Failed to fetch document history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const handleLogout = async () => {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      localStorage.removeItem("accessToken");
      setUser(null);
      setHistory([]);
      setActiveView("home");
      showToast("Logged out successfully", "success");
    }
  };

  // Generate assignment/reflective journal DOCX
  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!formData.topic.trim()) {
      showToast("Please enter a module or topic", "error");
      return;
    }

    setGenerating(true);
    showToast("Generating document, please wait...", "info");

    try {
      // Auto login in demo mode if token is missing
      if (!localStorage.getItem("accessToken")) {
        const auth = await apiRequest("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: "demo@example.com", password: "demo-password" })
        });
        localStorage.setItem("accessToken", auth.accessToken);
        await fetchUserProfile();
      }

      // Construct doc name prefix based on type
      const prefix = 
        assessmentType === "free_writing" 
          ? "FreeWriting" 
          : assessmentType === "literature_survey"
          ? "LiteratureSurvey"
          : "Journal";
      const userDocName = formData.document_name?.trim();
      const cleanDocName = userDocName 
        ? userDocName.replace(/[^a-zA-Z0-9_-]/g, "_")
        : (formData.topic.substring(0, 20).replace(/[^a-zA-Z0-9]/g, "_") || prefix) + "_Document";

      let studentNames = formData.student_name;
      let studentRolls = formData.registration_number;
      let classSectionCombined = formData.class_section || "A";
      
      if (assessmentType === "literature_survey") {
        if (formData.students && formData.students.length > 0) {
          studentNames = formData.students.map(s => s.name?.trim() || "Unknown").join(", ");
          studentRolls = formData.students.map(s => s.roll?.trim() || "N/A").join(", ");
        }
        
        const guideDesignation = formData.guide_designation || "";
        const guideDept = formData.guide_department || "";
        classSectionCombined = [guideDesignation, guideDept].filter(Boolean).join(", ");
      }

      const payload = {
        student_name: assessmentType === "literature_survey" ? studentNames : formData.student_name,
        registration_number: assessmentType === "literature_survey" ? studentRolls : formData.registration_number,
        academic_year: formData.academic_year,
        year_term: assessmentType === "literature_survey" ? (formData.university_name || "") : formData.year_term,
        course_name: assessmentType === "literature_survey" ? (formData.department_name || "") : formData.course_name, 
        topic: formData.topic,
        additional_instructions: formData.additional_instructions,
        document_name: cleanDocName,
        study_level: assessmentType === "literature_survey" ? (formData.university_location || "") : (formData.study_level || "UG"),
        class_section: assessmentType === "literature_survey" ? classSectionCombined : (formData.class_section || "A"),
        instructor: assessmentType === "literature_survey" ? (formData.guide_name || "") : (formData.instructor || "AI Assistant"),
        assessment: 
          assessmentType === "free_writing" 
            ? "Free Writing Assessment" 
            : assessmentType === "literature_survey"
            ? "Literature Survey Assessment"
            : "Reflective Journal",
        date: formData.date || new Date().toISOString().slice(0, 10),
        ...(assessmentType === "free_writing" ? { academic_domain: formData.academic_domain } : {}),
        ...(assessmentType === "literature_survey" ? { selected_papers: selectedPapers } : {})
      };

      let result;
      const targetEndpoint = 
        assessmentType === "free_writing" 
          ? "/api/generator/free-writing" 
          : assessmentType === "literature_survey"
          ? "/api/generator/literature-survey"
          : "/api/generator/assignments";
      try {
        result = await apiRequest(targetEndpoint, {
          method: "POST",
          body: JSON.stringify(payload)
        });
      } catch (err) {
        // Handle token expiry auto-renewal
        if (err.status === 401) {
          localStorage.removeItem("accessToken");
          const auth = await apiRequest("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ email: "demo@example.com", password: "demo-password" })
          });
          localStorage.setItem("accessToken", auth.accessToken);
          await fetchUserProfile();
          result = await apiRequest(targetEndpoint, {
            method: "POST",
            body: JSON.stringify(payload)
          });
        } else {
          throw err;
        }
      }

      showToast(
        assessmentType === "free_writing"
          ? "Free Writing Assessment generated successfully!"
          : assessmentType === "literature_survey"
          ? "Literature Survey Assessment generated successfully!"
          : "Reflective journal generated successfully!",
        "success"
      );
      fetchHistory(); // Refresh history
      setActiveView("history"); // Take user to history page
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to generate document.", "error");
    } finally {
      setGenerating(false);
    }
  };

  // Delete document from history
  const handleDeleteHistory = async (id) => {
    if (!confirm("Are you sure you want to delete this document from history?")) return;
    try {
      await apiRequest(`/api/generator/history/${id}`, { method: "DELETE" });
      showToast("Document deleted successfully", "success");
      fetchHistory();
    } catch (err) {
      showToast(err.message || "Failed to delete document.", "error");
    }
  };

  // Pre-fill form from history item to regenerate
  const handleRegenerate = (item) => {
    let cleanTopic = item.topic;
    let instructions = "";
    
    const splitIndex = item.topic.indexOf("\n\n[Additional Instructions]:\n");
    if (splitIndex !== -1) {
      cleanTopic = item.topic.substring(0, splitIndex);
      instructions = item.topic.substring(splitIndex + 30);
    }

    setAssessmentType(
      item.assessmentType === "free_writing" 
        ? "free_writing" 
        : item.assessmentType === "literature_survey"
        ? "literature_survey"
        : "reflective_journal"
    );

    const isLit = item.assessmentType === "literature_survey";
    
    // De-serialize multiple students if available
    let initialStudents = [{ name: user?.name || "", roll: "" }];
    if (isLit && item.student_name) {
      const names = item.student_name.split(", ");
      const rolls = (item.registration_number || "").split(", ");
      initialStudents = names.map((name, idx) => ({
        name,
        roll: rolls[idx] || ""
      }));
    }

    // Guide Designation & Dept separation
    let guideDesig = "Assistant Professor";
    let guideD = "Computer Science & Engineering";
    if (isLit && item.class_section) {
      const parts = item.class_section.split(", ");
      if (parts.length > 0) guideDesig = parts[0];
      if (parts.length > 1) guideD = parts[1];
    }

    setFormData({
      student_name: item.student_name || user?.name || "",
      registration_number: item.registration_number || "",
      academic_year: item.academic_year || (new Date().getFullYear() + " - " + (new Date().getFullYear() + 1)),
      year_term: item.year_term || "",
      study_level: item.study_level || "",
      class_section: item.class_section || "",
      instructor: item.instructor || "",
      document_name: item.documentName || "",
      course_name: item.course_name || "",
      academic_domain: item.academic_domain || "Computer Science & IT",
      topic: cleanTopic,
      additional_instructions: instructions,
      date: new Date().toISOString().slice(0, 10),
      students: initialStudents,
      university_name: isLit ? (item.year_term || "Aurora's PG College") : "Aurora's PG College",
      department_name: isLit ? (item.course_name || "Department of Computer Science & Engineering") : "Department of Computer Science & Engineering",
      university_location: isLit ? (item.study_level || "Hyderabad, Telangana") : "Hyderabad, Telangana",
      guide_name: isLit ? (item.instructor || "") : "",
      guide_designation: guideDesig,
      guide_department: guideD
    });

    setActiveView("dashboard");
    showToast("Form details loaded. You can refine and generate again.", "success");
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-200">
      
      {/* Dynamic Background subtle overlay */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-zinc-200/30 dark:bg-zinc-900/20 rounded-full blur-[120px] -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-zinc-200/20 dark:bg-zinc-900/10 rounded-full blur-[150px] translate-y-1/2"></div>
      </div>

      {/* Dynamic Toast notifications */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 flex-row rounded-xl border shadow-lg max-w-sm backdrop-blur-md ${
              toast.type === "error"
                ? "bg-rose-50/90 border-rose-200/80 text-rose-800 dark:bg-rose-950/80 dark:border-rose-900/50 dark:text-rose-200"
                : toast.type === "info"
                ? "bg-zinc-50/95 border-zinc-200 text-zinc-800 dark:bg-zinc-900/90 dark:border-zinc-800 dark:text-zinc-200"
                : "bg-emerald-50/90 border-emerald-200/80 text-emerald-800 dark:bg-emerald-950/80 dark:border-emerald-900/50 dark:text-emerald-200"
            }`}
          >
            {toast.type === "error" ? (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            ) : toast.type === "info" ? (
              <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin" />
            ) : (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            )}
            <p className="text-sm font-medium leading-relaxed">{toast.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Sticky Navbar */}
      <header className="sticky top-4 z-40 max-w-5xl mx-auto px-6 py-3.5 mx-4 md:mx-auto bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 rounded-full flex items-center justify-between shadow-sm transition-all">
        <button
          onClick={() => setActiveView("home")}
          className="flex items-center gap-2.5 font-semibold text-lg text-zinc-900 dark:text-white"
        >
          <span className="p-1.5 bg-zinc-900 dark:bg-zinc-100 rounded-lg text-white dark:text-black">
            <BrainCircuit className="w-5 h-5" />
          </span>
          <span className="tracking-tight">Assessment Maker</span>
        </button>

        {user && (
          <nav className="hidden md:flex items-center gap-1.5 p-1 bg-zinc-100/50 dark:bg-zinc-900/40 rounded-full border border-zinc-200/20 dark:border-zinc-800/20">
            <button
              onClick={() => setActiveView("dashboard")}
              className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all ${
                activeView === "dashboard"
                  ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveView("history")}
              className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all ${
                activeView === "history"
                  ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              History
            </button>
          </nav>
        )}

        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleTheme}
            className="p-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 rounded-full text-zinc-500 dark:text-zinc-400 transition-all"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {loadingUser ? (
            <div className="h-9 w-20 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-full"></div>
          ) : user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <span className="text-xs font-semibold tracking-tight">{user.name || "Demo User"}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-full text-xs font-medium transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setActiveView("login")}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 rounded-full text-xs font-semibold shadow-sm transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-6 py-12 relative z-10">
        <AnimatePresence mode="wait">
          
          {/* ====================================================
              LANDING PAGE
              ==================================================== */}
          {activeView === "home" && (
            <motion.div
              key="landing"
              initial="hidden"
              animate="show"
              exit="hidden"
              variants={fadeUp}
              className="space-y-24"
            >
              {/* Hero Section */}
              <section className="text-center py-12 max-w-2xl mx-auto space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-full text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  <Sparkle className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>Next-Generation Academic Writing</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-none bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-500 dark:from-white dark:via-zinc-300 dark:to-zinc-500 bg-clip-text text-transparent">
                  Academic DOCX journals, generated with precision.
                </h1>
                <p className="text-lg text-zinc-500 dark:text-zinc-400 font-normal leading-relaxed">
                  Fast, custom-tailored, and beautifully formatted reflective journals and summaries that match university requirements. Zero corporate fluff, pure speed.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                  <button
                    onClick={() => setActiveView(user ? "dashboard" : "login")}
                    className="w-full sm:w-auto px-7 py-3 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-medium rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  {!user && (
                    <button
                      onClick={() => setActiveView("login")}
                      className="w-full sm:w-auto px-7 py-3 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-150 dark:hover:bg-zinc-900/50 font-medium rounded-xl flex items-center justify-center gap-2 transition-all"
                    >
                      Sign In
                    </button>
                  )}
                </div>
              </section>

              {/* Product Preview */}
              <section className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800/50 p-2.5 bg-white/30 dark:bg-zinc-900/30 backdrop-blur-sm overflow-hidden shadow-2xl">
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-800 to-transparent"></div>
                <div className="rounded-xl overflow-hidden border border-zinc-200/60 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950 p-6 space-y-6">
                  {/* Mock Navbar */}
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-900 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-zinc-250 dark:bg-zinc-800" />
                      <span className="w-3 h-3 rounded-full bg-zinc-250 dark:bg-zinc-800" />
                      <span className="w-3 h-3 rounded-full bg-zinc-250 dark:bg-zinc-800" />
                    </div>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500 font-mono">premium_dashboard_preview.io</span>
                    <span className="w-8 h-8 rounded-full bg-zinc-250 dark:bg-zinc-900" />
                  </div>
                  {/* Form Mockup */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="h-4.5 w-24 bg-zinc-200 dark:bg-zinc-900 rounded animate-pulse"></div>
                        <div className="h-10 w-full bg-zinc-200/50 dark:bg-zinc-900/50 rounded-lg border border-zinc-205 dark:border-zinc-900 animate-pulse"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-4.5 w-32 bg-zinc-200 dark:bg-zinc-900 rounded animate-pulse"></div>
                        <div className="h-10 w-full bg-zinc-200/50 dark:bg-zinc-900/50 rounded-lg border border-zinc-205 dark:border-zinc-900 animate-pulse"></div>
                      </div>
                      <div className="h-11 w-full bg-zinc-900 dark:bg-zinc-100 rounded-lg flex items-center justify-center text-white dark:text-black font-semibold text-xs gap-1.5 shadow-sm opacity-80 cursor-default">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Generate DOCX</span>
                      </div>
                    </div>
                    <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col justify-between min-h-[200px]">
                      <div className="space-y-2.5">
                        <div className="h-5 w-32 bg-zinc-200 dark:bg-zinc-900 rounded animate-pulse"></div>
                        <div className="h-3.5 w-full bg-zinc-200/60 dark:bg-zinc-900/40 rounded animate-pulse"></div>
                        <div className="h-3.5 w-4/5 bg-zinc-200/60 dark:bg-zinc-900/40 rounded animate-pulse"></div>
                      </div>
                      <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-900 pt-3 text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                        <span>Reflective_Journal_AI.docx</span>
                        <span className="p-1 bg-zinc-100 dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-800">
                          <Download className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Features Section */}
              <section className="space-y-12">
                <div className="text-center space-y-3">
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Real academic capabilities. Zero filler.</h2>
                  <p className="text-zinc-500 dark:text-zinc-400">Everything you need to write and export scholarly reflective reports.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {[
                    {
                      title: "Reflective Generation",
                      description: "Creates rich reflective writings styled after academic standards.",
                      icon: <BrainCircuit className="w-5 h-5 text-zinc-900 dark:text-white" />
                    },
                    {
                      title: "Standard DOCX Export",
                      description: "Saves outputs directly as downloadable, fully styled DOCX files.",
                      icon: <FileText className="w-5 h-5 text-zinc-900 dark:text-white" />
                    },
                    {
                      title: "Academic Formatting",
                      description: "Pre-configures submission headers, dates, and course titles.",
                      icon: <GraduationCap className="w-5 h-5 text-zinc-900 dark:text-white" />
                    },
                    {
                      title: "Sub-Minute Speed",
                      description: "Utilizes fast Groq Llama models to output drafts in under 30 seconds.",
                      icon: <Sparkles className="w-5 h-5 text-zinc-900 dark:text-white" />
                    },
                    {
                      title: "Saved History Logs",
                      description: "Exposes past generated documents to download or regenerate instantly.",
                      icon: <Layers className="w-5 h-5 text-zinc-900 dark:text-white" />
                    },
                    {
                      title: "Tailored Instructions",
                      description: "Refines the writing perspective using specific additional notes.",
                      icon: <BookOpen className="w-5 h-5 text-zinc-900 dark:text-white" />
                    }
                  ].map((feat, i) => (
                    <div
                      key={i}
                      className="p-6 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 flex flex-col justify-between space-y-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-sm"
                    >
                      <div className="p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg w-fit">
                        {feat.icon}
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold tracking-tight">{feat.title}</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{feat.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* How It Works */}
              <section className="space-y-12 py-6">
                <div className="text-center space-y-3">
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight">How it works</h2>
                  <p className="text-zinc-500 dark:text-zinc-400">Generate your university reflective reports in three simple steps.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                    { step: "01", title: "Fill Details", desc: "Input student metadata, subject name, academic year, and the main assignment topic." },
                    { step: "02", title: "Configure & Run", desc: "Write additional prompt instructions to guide the reflection tone, then generate." },
                    { step: "03", title: "Export DOCX", desc: "View the instant log results, review, and download your fully formatted MS Word doc." }
                  ].map((item, idx) => (
                    <div key={idx} className="relative group space-y-3">
                      <span className="font-mono text-3xl font-bold text-zinc-300 dark:text-zinc-800 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 transition-colors">
                        {item.step}
                      </span>
                      <h3 className="text-base font-semibold tracking-tight">{item.title}</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Final CTA / Footer */}
              <footer className="pt-16 pb-8 border-t border-zinc-200 dark:border-zinc-900 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-400 dark:text-zinc-650 gap-4">
                <span>&copy; {new Date().getFullYear()} Assessment Maker Premium. All rights reserved.</span>
                <div className="flex items-center gap-4">
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors"
                  >
                    GitHub
                  </a>
                  <span>&bull;</span>
                  <button
                    onClick={() => setActiveView("login")}
                    className="hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors"
                  >
                    Console Access
                  </button>
                </div>
              </footer>
            </motion.div>
          )}

          {/* ====================================================
              AUTH PAGE (LOGIN / SIGN UP)
              ==================================================== */}
          {activeView === "login" && (
            <motion.div
              key="auth"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex justify-center py-16"
            >
              <AuthCard 
                setActiveView={setActiveView} 
                fetchUserProfile={fetchUserProfile}
                showToast={showToast}
              />
            </motion.div>
          )}

          {/* ====================================================
              MAIN DASHBOARD (GENERATION FORM)
              ==================================================== */}
          {activeView === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className={`mx-auto space-y-8 transition-all duration-500 ease-out px-4 ${
                assessmentType === "literature_survey" ? "max-w-6xl" : "max-w-2xl"
              }`}
            >
              {/* Sleek Vercel-style Tab Switcher */}
              <AssessmentSwitcher
                assessmentType={assessmentType}
                setAssessmentType={setAssessmentType}
              />

              <div className="space-y-2">
                <h1 className="text-2xl font-extrabold tracking-tight">
                  {assessmentType === "free_writing" 
                    ? "Free Writing Assessment Studio" 
                    : assessmentType === "literature_survey"
                    ? "AI Literature Survey Studio"
                    : "AI Reflective Journal Studio"}
                </h1>
                <p className="text-sm text-zinc-555 dark:text-zinc-400 leading-relaxed">
                  {assessmentType === "free_writing"
                    ? "Enter student credentials and academic domain details. Our pipeline will build a comprehensive, dynamically structured academic assessment."
                    : assessmentType === "literature_survey"
                    ? "Search real research papers from Semantic Scholar and arXiv, select the most relevant, and synthesize a structured scholarly literature survey."
                    : "Enter student credentials and subject details. Our pipeline will build a comprehensive, formatted reflective journal document."}
                </p>
              </div>

              {assessmentType === "free_writing" ? (
                <FreeWritingForm
                  formData={formData}
                  setFormData={setFormData}
                  onSubmit={handleGenerate}
                  generating={generating}
                />
              ) : assessmentType === "literature_survey" ? (
                <LiteratureSurveyForm
                  formData={formData}
                  setFormData={setFormData}
                  onSubmit={handleGenerate}
                  generating={generating}
                  selectedPapers={selectedPapers}
                  setSelectedPapers={setSelectedPapers}
                />
              ) : (
                <ReflectiveJournalForm
                  formData={formData}
                  setFormData={setFormData}
                  onSubmit={handleGenerate}
                  generating={generating}
                />
              )}
            </motion.div>
          )}

          {/* ====================================================
              DOCX HISTORY PAGE
              ==================================================== */}
          {activeView === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h1 className="text-2xl font-extrabold tracking-tight">Generated Document Logs</h1>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Find and manage your past AI DOCX generations.
                  </p>
                </div>
                <button
                  onClick={fetchHistory}
                  disabled={loadingHistory}
                  className="p-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900/50 rounded-lg text-zinc-500 dark:text-zinc-400 transition-all flex items-center gap-1.5 text-xs font-semibold"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {loadingHistory ? (
                <div className="space-y-3.5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 w-full border border-zinc-200 dark:border-zinc-900 rounded-xl bg-zinc-200/55 dark:bg-zinc-900/35 animate-pulse"></div>
                  ))}
                </div>
              ) : history.length === 0 ? (
                <div className="border border-zinc-200/80 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900/30 p-12 text-center max-w-md mx-auto space-y-4 shadow-sm">
                  <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl w-fit mx-auto text-zinc-400 dark:text-zinc-650">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-semibold">No documents found</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    You haven't generated any assessment DOCX files yet. Run one in the studio!
                  </p>
                  <button
                    onClick={() => setActiveView("dashboard")}
                    className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-medium rounded-xl text-xs shadow-sm transition-all"
                  >
                    Go to Studio
                  </button>
                </div>
              ) : (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="border-b border-zinc-105 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                          <th className="px-6 py-4">Filename</th>
                          <th className="px-6 py-4">Type</th>
                          <th className="px-6 py-4">Topic Summary</th>
                          <th className="px-6 py-4">Date Created</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
                        {history.map((doc) => (
                          <tr key={doc._id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                            <td className="px-6 py-4.5 font-medium max-w-[200px] truncate text-zinc-900 dark:text-zinc-100">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                                <span className="truncate" title={doc.documentName}>
                                  {doc.documentName}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                                doc.assessmentType === "free_writing"
                                  ? "bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700"
                                  : doc.assessmentType === "literature_survey"
                                  ? "bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/50"
                                  : "bg-zinc-50 text-zinc-600 border-zinc-200/60 dark:bg-zinc-900/60 dark:text-zinc-400 dark:border-zinc-800"
                              }`}>
                                {doc.assessmentType === "free_writing" ? "Free Writing" : doc.assessmentType === "literature_survey" ? "Literature Survey" : "Reflective Journal"}
                              </span>
                            </td>
                            <td className="px-6 py-4.5 max-w-[240px] truncate text-zinc-500 dark:text-zinc-400">
                              <span className="truncate" title={doc.topic}>
                                {doc.topic}
                              </span>
                            </td>
                            <td className="px-6 py-4.5 text-xs text-zinc-400 dark:text-zinc-500">
                              {new Date(doc.createdAt).toLocaleString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </td>
                            <td className="px-6 py-4.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {doc.status === "failed" ? (
                                  <span className="text-xs font-semibold text-rose-500 mr-2 flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5" /> Failed
                                  </span>
                                ) : doc.status === "processing" ? (
                                  <span className="text-xs font-semibold text-amber-500 mr-2 flex items-center gap-1">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing
                                  </span>
                                ) : (
                                  <a
                                    href={doc.aiServiceUrl?.startsWith("http") ? doc.aiServiceUrl : `${API_URL}/api/generator/download/${doc._id}?token=${localStorage.getItem("accessToken")}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 rounded-lg text-zinc-650 dark:text-zinc-300 transition-all"
                                    title="Download"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                )}
                                <button
                                  onClick={() => handleRegenerate(doc)}
                                  className="p-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 rounded-lg text-zinc-650 dark:text-zinc-300 transition-all"
                                  title="Edit & Regenerate"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteHistory(doc._id)}
                                  className="p-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 rounded-lg text-zinc-500 dark:text-zinc-500 transition-all"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Subtle spacer */}
      <div className="h-16"></div>
      
    </div>
  );
}

// ====================================================
// AUTH CARD SUBCOMPONENT
// ====================================================
function AuthCard({ setActiveView, fetchUserProfile, showToast }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  const [form, setForm] = useState({
    name: "",
    email: "demo@example.com",
    password: "demo-password"
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const payload = isLogin
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password };

      const response = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      localStorage.setItem("accessToken", response.accessToken);
      await fetchUserProfile();
      
      showToast(
        isLogin ? "Logged in successfully" : "Account registered successfully",
        "success"
      );
      
      setActiveView("dashboard");
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Authentication failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
      
      {/* Head */}
      <div className="text-center space-y-1.5">
        <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
          {isLogin ? "Welcome back" : "Create an account"}
        </h2>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
          {isLogin ? "Sign in to access the generation console" : "Register to generate reflective DOCX files"}
        </p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 p-1 bg-zinc-100 dark:bg-zinc-950 rounded-xl border border-zinc-200/30 dark:border-zinc-900/30 text-xs font-semibold">
        <button
          onClick={() => {
            setIsLogin(true);
            setErrorMsg("");
          }}
          className={`py-2 rounded-lg transition-all ${
            isLogin
              ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-950 dark:text-white"
              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-200"
          }`}
        >
          Sign In
        </button>
        <button
          onClick={() => {
            setIsLogin(false);
            setErrorMsg("");
          }}
          className={`py-2 rounded-lg transition-all ${
            !isLogin
              ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-950 dark:text-white"
              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-200"
          }`}
        >
          Register
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Name</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-650">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                placeholder="Vignesh Kumar"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650 transition-all text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Email address</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-650">
              <Mail className="w-4 h-4" />
            </span>
            <input
              type="email"
              required
              placeholder="name@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650 transition-all text-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Password</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-650">
              <Key className="w-4 h-4" />
            </span>
            <input
              type="password"
              required
              placeholder="Minimum 8 characters"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650 transition-all text-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/50 dark:border-rose-900/50 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-semibold rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <span>{isLogin ? "Continue" : "Sign Up"}</span>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative flex items-center justify-center my-1.5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-100 dark:border-zinc-800"></div>
        </div>
        <span className="relative px-3 bg-white dark:bg-zinc-900 text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
          Or continue with
        </span>
      </div>

      {/* OAuth Rows */}
      <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
        <a
          href={`${API_URL}/api/auth/google`}
          className="flex items-center justify-center gap-2 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900/50 rounded-xl text-zinc-700 dark:text-zinc-300 transition-all text-center no-underline"
        >
          Google
        </a>
        <a
          href={`${API_URL}/api/auth/github`}
          className="flex items-center justify-center gap-2 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900/50 rounded-xl text-zinc-700 dark:text-zinc-300 transition-all text-center no-underline"
        >
          GitHub
        </a>
      </div>
    </div>
  );
}
