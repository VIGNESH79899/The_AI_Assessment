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
  Sparkle,
  Check,
  Crown,
  CreditCard
} from "lucide-react";
import { useTheme } from "./hooks/useTheme.js";
import { AssessmentSwitcher } from "./components/assessments/AssessmentSwitcher.jsx";
import { ReflectiveJournalForm } from "./components/assessments/ReflectiveJournalForm.jsx";
import { FreeWritingForm } from "./components/assessments/FreeWritingForm.jsx";
import { LiteratureSurveyForm } from "./components/assessments/LiteratureSurveyForm.jsx";

const API_URL = import.meta.env.VITE_API_URL || "";

// Reusable apiRequest utility
export async function apiRequest(path, options = {}) {
  let token = localStorage.getItem("accessToken");
  let response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  if (response.status === 401 && path !== "/api/auth/refresh" && path !== "/api/auth/login") {
    try {
      const refreshResponse = await fetch(`${API_URL}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" }
      });
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        if (refreshData.accessToken) {
          localStorage.setItem("accessToken", refreshData.accessToken);
          token = refreshData.accessToken;
          response = await fetch(`${API_URL}${path}`, {
            ...options,
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
              ...options.headers
            }
          });
        }
      }
    } catch (refreshErr) {
      console.warn("Token refresh failed:", refreshErr);
    }
  }
  
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
  const [activeView, setActiveView] = useState(() => {
    const path = window.location.pathname;
    if (path === "/auth/callback" || path.startsWith("/auth/callback")) {
      return "callback";
    }
    if (path === "/login" || path.startsWith("/login")) {
      return "login";
    }
    return "home";
  });
  
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
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null, name: "" });
  const [deleting, setDeleting] = useState(false);
  const [isAiServiceReady, setIsAiServiceReady] = useState(false);
  const [isCheckingReady, setIsCheckingReady] = useState(true);

  // Billing and Subscription state
  const [couponCode, setCouponCode] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [checkingOutPlan, setCheckingOutPlan] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  
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
    const path = window.location.pathname;
    if (path === "/auth/callback" || path.startsWith("/auth/callback")) {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      const error = params.get("error");
      
      if (error) {
        showToast(`Authentication failed: ${error}`, "error");
        setActiveView("login");
        window.history.replaceState({}, document.title, "/");
        setLoadingUser(false);
      } else if (token) {
        localStorage.setItem("accessToken", token);
        setLoadingUser(true);
        apiRequest("/api/auth/me")
          .then((data) => {
            if (data.user) {
              setUser(data.user);
              fetchHistory();
              showToast("Logged in successfully with OAuth!", "success");
              setActiveView("dashboard");
            } else {
              throw new Error("Invalid user data");
            }
          })
          .catch((err) => {
            console.error("OAuth profile fetch failed:", err);
            localStorage.removeItem("accessToken");
            setUser(null);
            showToast("Failed to complete OAuth authentication.", "error");
            setActiveView("login");
          })
          .finally(() => {
            setLoadingUser(false);
            window.history.replaceState({}, document.title, "/");
          });
      } else {
        showToast("Missing authentication token.", "error");
        setActiveView("login");
        window.history.replaceState({}, document.title, "/");
        setLoadingUser(false);
      }
    } else {
      if (path === "/login" || path.startsWith("/login")) {
        const params = new URLSearchParams(window.location.search);
        const error = params.get("error");
        const oauth = params.get("oauth");
        if (error === "oauth") {
          showToast("OAuth login failed. Please try again.", "error");
        } else if (oauth === "google-unconfigured") {
          showToast("Google OAuth is not configured in backend.", "error");
        } else if (oauth === "github-unconfigured") {
          showToast("GitHub OAuth is not configured in backend.", "error");
        }
        window.history.replaceState({}, document.title, "/");
      }
      fetchUserProfile();
    }
  }, []);

  // Pre-fill student name in form when user profile is loaded
  useEffect(() => {
    if (user && user.name && !formData.student_name) {
      setFormData(prev => ({
        ...prev,
        student_name: user.name
      }));
    }
  }, [user]);

  // Trigger AI service wakeup when dashboard view becomes active, and poll for readiness status
  useEffect(() => {
    if (!user || activeView !== "dashboard") {
      return;
    }

    // Proactive wakeup call (fire and forget)
    console.log("[WAKEUP] Navigation to dashboard detected. Triggering AI service wakeup...");
    apiRequest("/api/generator/wakeup", { method: "POST" }).catch(err => {
      console.warn("[WAKEUP] Wakeup request failed:", err);
    });

    let isMounted = true;
    let pollInterval = null;

    const checkStatus = async () => {
      try {
        const data = await apiRequest("/api/generator/status");
        if (isMounted) {
          setIsAiServiceReady(!!data.ready);
          setIsCheckingReady(false);
        }
      } catch (err) {
        console.warn("[STATUS] Failed to check status:", err);
        if (isMounted) {
          setIsAiServiceReady(false);
          setIsCheckingReady(false);
        }
      }
    };

    // Run status check immediately
    setIsCheckingReady(true);
    checkStatus();

    // Check status every 5 seconds
    pollInterval = setInterval(checkStatus, 5000);

    return () => {
      isMounted = false;
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [activeView, user]);

  // Fetch invoices when billing view is selected
  useEffect(() => {
    if (!user || activeView !== "billing") return;

    const fetchInvoices = async () => {
      setLoadingInvoices(true);
      try {
        const data = await apiRequest("/api/invoices");
        setInvoices(data.invoices || []);
      } catch (err) {
        console.error("Failed to fetch invoices:", err);
      } finally {
        setLoadingInvoices(false);
      }
    };

    fetchInvoices();
  }, [activeView, user]);

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

      // Trigger automatic DOCX download
      const downloadUrl = result.url || result.downloadUrl;
      if (downloadUrl) {
        console.log("[DOWNLOAD] Opening DOCX:", downloadUrl);
        window.open(downloadUrl, "_blank");
      } else {
        console.warn("[DOWNLOAD] No download URL in response:", result);
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
  const handleDeleteHistory = (id, name) => {
    setDeleteConfirm({ show: true, id, name: name || "this document" });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return;
    setDeleting(true);
    try {
      await apiRequest(`/api/generator/history/${deleteConfirm.id}`, { method: "DELETE" });
      showToast("Document deleted successfully", "success");
      fetchHistory();
    } catch (err) {
      showToast(err.message || "Failed to delete document.", "error");
    } finally {
      setDeleting(false);
      setDeleteConfirm({ show: false, id: null, name: "" });
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
          <img src="/favicon-256.png" alt="AI Assessment Maker" className="w-8 h-8 rounded-lg object-contain" />
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
            <button
              onClick={() => setActiveView("profile")}
              className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all ${
                activeView === "profile"
                  ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveView("billing")}
              className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all ${
                activeView === "billing"
                  ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              Subscription
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
              <div 
                onClick={() => setActiveView("profile")}
                className="hidden sm:block text-right cursor-pointer hover:underline text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
                title="View Profile Settings"
              >
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
              className="space-y-28 relative pb-24"
            >
              {/* Premium Background */}
              <div className="absolute inset-0 -z-20 h-full w-full bg-transparent bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
              <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[400px] w-[400px] rounded-full bg-blue-500/20 dark:bg-blue-600/20 blur-[120px] pointer-events-none"></div>

              {/* Hero Section */}
              <section className="py-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                {/* Left side: Text */}
                <div className="space-y-7 text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-full text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                    <Sparkle className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>AI-Powered Academic Document Studio</span>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight bg-gradient-to-br from-zinc-900 via-zinc-700 to-zinc-500 dark:from-white dark:via-zinc-200 dark:to-zinc-500 bg-clip-text text-transparent">
                    Generate university-ready academic documents in minutes.
                  </h1>
                  <p className="text-base text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xl mx-auto lg:mx-0">
                    Reflective journals, free writing assessments, and literature surveys — all AI-generated, perfectly formatted, and ready to submit. Built specifically for Aurora's PG College students.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                    <button
                      onClick={() => setActiveView(user ? "dashboard" : "login")}
                      className="w-full sm:w-auto px-8 py-3.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-semibold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all text-sm"
                    >
                      <span>{user ? "Open Studio" : "Get Started — It's Free"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    {!user && (
                      <button
                        onClick={() => setActiveView("login")}
                        className="w-full sm:w-auto px-7 py-3.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 font-medium rounded-xl flex items-center justify-center gap-2 transition-all text-sm text-zinc-700 dark:text-zinc-300"
                      >
                        Sign In to your account
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 dark:text-zinc-600 pt-1">
                    No installation. No configuration. Just fill in your details and generate.
                  </p>
                </div>

                {/* Right side: Interactive Visualizer */}
                <div className="relative w-full aspect-[4/3] rounded-2xl bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col overflow-hidden shadow-2xl">
                  {/* Decorative background glow */}
                  <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[200px] h-[200px] bg-blue-500/20 blur-[60px] rounded-full pointer-events-none"></div>
                  
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-200 dark:border-zinc-800 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center border-2 border-white dark:border-zinc-900 shadow-sm">
                          <BrainCircuit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center border-2 border-white dark:border-zinc-900 shadow-sm">
                          <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">AI Engine</h3>
                        <p className="text-[10px] text-zinc-500 font-medium">Processing request...</p>
                      </div>
                    </div>
                    <div className="px-2.5 py-1 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded-full flex items-center gap-1.5 shadow-sm">
                      <Sparkles className="w-3 h-3 animate-pulse" />
                      GENERATING
                    </div>
                  </div>

                  {/* Active Prompt */}
                  <div className="bg-white dark:bg-zinc-800/80 rounded-lg p-3 mb-4 border border-zinc-200 dark:border-zinc-700 shadow-sm relative z-10">
                    <div className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                      <User className="w-3 h-3" /> User Prompt
                    </div>
                    <div className="font-mono text-xs text-zinc-800 dark:text-zinc-200 flex items-center">
                      <ChevronRight className="w-3 h-3 text-emerald-500 mr-1 flex-shrink-0" />
                      <motion.span
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 2.5, ease: "linear", repeat: Infinity, repeatType: "reverse", repeatDelay: 5 }}
                        className="overflow-hidden whitespace-nowrap inline-block align-bottom"
                      >
                        Write a Literature Survey on AI in Education.
                      </motion.span>
                    </div>
                  </div>

                  {/* Document Preview Area */}
                  <div className="flex-1 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 shadow-inner relative overflow-hidden flex flex-col z-10">
                    <div className="flex items-center gap-2 mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                      <div className="ml-2 text-[10px] font-medium text-zinc-400 font-mono">Literature_Survey.docx</div>
                    </div>
                    
                    {/* Animated Text Lines */}
                    <div className="space-y-4 flex-1 mt-2">
                      {/* Title */}
                      <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 0.5, repeat: Infinity, repeatType: "reverse", repeatDelay: 6 }}
                        className="h-3 bg-zinc-800 dark:bg-zinc-200 w-3/4 rounded-sm mx-auto"
                      />
                      
                      {/* Abstract / Intro */}
                      <div className="space-y-2">
                        <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 0.4, delay: 1.5, repeat: Infinity, repeatType: "reverse", repeatDelay: 6.1 }} className="h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-sm" />
                        <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 0.4, delay: 1.9, repeat: Infinity, repeatType: "reverse", repeatDelay: 5.7 }} className="h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-sm" />
                        <motion.div initial={{ width: 0 }} animate={{ width: "60%" }} transition={{ duration: 0.3, delay: 2.3, repeat: Infinity, repeatType: "reverse", repeatDelay: 5.4 }} className="h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-sm" />
                      </div>
                      
                      {/* Citations / Formatted Block */}
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 3, repeat: Infinity, repeatType: "reverse", repeatDelay: 4.5 }}
                        className="bg-zinc-50 dark:bg-zinc-800/50 p-2.5 border-l-2 border-blue-500 rounded-r-md text-[8px] sm:text-[9px] font-mono text-zinc-600 dark:text-zinc-300 leading-relaxed shadow-sm"
                      >
                        <span className="font-bold text-blue-600 dark:text-blue-400">References:</span><br/>
                        [1] Smith, J. (2023). "AI in Pedagogy". Journal of EdTech.<br/>
                        [2] Doe, A. (2024). "Machine Learning for Assessment".
                      </motion.div>
                    </div>

                    {/* Completion Overlay */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 4.5, duration: 0.5, repeat: Infinity, repeatType: "reverse", repeatDelay: 3 }}
                      className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-xs font-bold cursor-pointer transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download DOCX
                    </motion.div>
                  </div>
                </div>
              </section>

              {/* What Can You Generate — 3 Cards */}
              <section className="space-y-10">
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-bold uppercase tracking-widest">
                    <Layers className="w-3 h-3" /> Capabilities
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight">What can you generate?</h2>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-lg mx-auto">Three types of academic documents — all formatted, cited, and ready to submit.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    {
                      icon: <BookOpen className="w-6 h-6" />,
                      iconBg: "bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors",
                      title: "Reflective Journal",
                      desc: "Write a structured academic reflection on any module or subject topic. Includes course details, student credentials, and a formatted DOCX.",
                      tag: "Most Used"
                    },
                    {
                      icon: <Layers className="w-6 h-6" />,
                      iconBg: "bg-violet-100 dark:bg-violet-900/60 text-violet-600 dark:text-violet-400 group-hover:bg-violet-600 group-hover:text-white transition-colors",
                      title: "Free Writing Assessment",
                      desc: "Generate an open-ended academic writing assessment on any domain topic. Exported as a clean, printable Word document.",
                      tag: "Creative"
                    },
                    {
                      icon: <GraduationCap className="w-6 h-6" />,
                      iconBg: "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors",
                      title: "Literature Survey",
                      desc: "Search real papers from Semantic Scholar & arXiv, select relevant articles, and synthesize a complete literature survey DOCX with citations.",
                      tag: "Research"
                    }
                  ].map((card, i) => (
                    <motion.div
                      whileHover={{ y: -5 }}
                      key={i}
                      className="group relative p-6 rounded-2xl border bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-xl transition-all space-y-5 flex flex-col overflow-hidden"
                    >
                      {/* Subtle hover background gradient */}
                      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-zinc-50 dark:to-zinc-800/20 opacity-0 group-hover:opacity-100 transition-opacity -z-10"></div>
                      
                      <div className="flex items-center justify-between relative z-10">
                        <div className={`p-3 rounded-xl shadow-sm ${card.iconBg}`}>
                          {card.icon}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                          {card.tag}
                        </span>
                      </div>
                      <div className="space-y-2 flex-1 relative z-10">
                        <h3 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{card.title}</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{card.desc}</p>
                      </div>
                      <button
                        onClick={() => setActiveView(user ? "dashboard" : "login")}
                        className="w-full text-xs font-semibold py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 group-hover:bg-zinc-900 group-hover:text-white dark:group-hover:bg-zinc-100 dark:group-hover:text-zinc-900 text-zinc-700 dark:text-zinc-300 transition-all flex items-center justify-center gap-1.5 relative z-10"
                      >
                        Try this <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* How It Works */}
              <section className="space-y-12 py-8 relative">
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-bold uppercase tracking-widest">
                    <RefreshCw className="w-3 h-3" /> Process
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight">How it works</h2>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm">From details to download in under a minute.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
                  {/* Desktop connecting line */}
                  <div className="hidden md:block absolute top-[1.8rem] left-[12%] right-[12%] h-[2px] bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-700 to-transparent -z-10"></div>
                  
                  {[
                    { step: "1", icon: <User className="w-5 h-5" />, title: "Enter Details", desc: "Add name, roll number, course, and guide." },
                    { step: "2", icon: <BookOpen className="w-5 h-5" />, title: "Pick a Topic", desc: "Search scholarly papers or type a topic." },
                    { step: "3", icon: <Sparkles className="w-5 h-5" />, title: "AI Generation", desc: "Our pipeline writes the full document." },
                    { step: "4", icon: <Download className="w-5 h-5" />, title: "Download DOCX", desc: "Instantly download a formatted Word file." }
                  ].map((item, idx) => (
                    <motion.div 
                      whileHover={{ y: -5 }}
                      key={idx} 
                      className="group relative space-y-4 text-center"
                    >
                      <div className="mx-auto w-14 h-14 rounded-2xl bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 group-hover:border-blue-500/50 flex items-center justify-center text-zinc-600 dark:text-zinc-400 group-hover:text-blue-500 group-hover:shadow-lg group-hover:shadow-blue-500/20 transition-all">
                        {item.icon}
                      </div>
                      <div className="space-y-1.5 px-2">
                        <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Step {item.step}</p>
                        <h3 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-white">{item.title}</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{item.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Feature Highlights - Bento Grid */}
              <section className="space-y-10">
                <div className="text-center space-y-3">
                  <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Built for students, not enterprises</h2>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-xl mx-auto">Everything you need to submit top-tier academic work, packed into an intuitive, lightning-fast platform.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-4 h-auto md:h-[400px]">
                  {/* Large Card 1 */}
                  <motion.div 
                    whileHover={{ scale: 1.01 }}
                    className="md:col-span-2 md:row-span-2 p-8 rounded-3xl bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/10 dark:to-zinc-900 shadow-sm border border-zinc-200/60 dark:border-zinc-800/60 flex flex-col justify-between hover:shadow-lg transition-all relative overflow-hidden group"
                  >
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-400/20 rounded-full blur-3xl group-hover:bg-blue-400/30 transition-all"></div>
                    <div className="space-y-2 relative z-10">
                      <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-700 flex items-center justify-center text-blue-600 mb-6">
                        <GraduationCap className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">Strict University Formatting</h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-sm">Outputs match Aurora's PG College cover page, heading hierarchy, font size, and spacing requirements perfectly. No manual tweaking needed.</p>
                    </div>
                  </motion.div>

                  {/* Top Right Card */}
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="md:col-span-2 p-6 rounded-3xl bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200/60 dark:border-zinc-800/60 hover:shadow-md transition-all flex gap-4 items-center group"
                  >
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl text-emerald-600 flex-shrink-0 group-hover:scale-110 transition-transform">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">Real Academic Papers</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mt-1">Surveys pull live, verifiable articles from Semantic Scholar. Zero AI hallucinations in your citations.</p>
                    </div>
                  </motion.div>

                  {/* Bottom Right Card 1 */}
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="p-6 rounded-3xl bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200/60 dark:border-zinc-800/60 hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div className="p-2.5 bg-violet-50 dark:bg-violet-900/20 rounded-xl text-violet-600 w-max mb-3 group-hover:scale-110 transition-transform">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-white">Instant Gen</h3>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">Groq AI builds docs in 30s flat.</p>
                    </div>
                  </motion.div>

                  {/* Bottom Right Card 2 */}
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="p-6 rounded-3xl bg-zinc-900 dark:bg-zinc-100 shadow-sm border border-zinc-800 dark:border-zinc-200 hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div className="p-2.5 bg-zinc-800 dark:bg-zinc-200 rounded-xl text-white dark:text-zinc-900 w-max mb-3 group-hover:scale-110 transition-transform">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold tracking-tight text-white dark:text-zinc-900">Direct DOCX</h3>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-600 mt-1">One-click native MS Word export.</p>
                    </div>
                  </motion.div>
                </div>
              </section>

              {/* Final CTA Banner */}
              <section className="relative rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl">
                {/* Background glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-transparent to-emerald-50 dark:from-blue-900/20 dark:via-transparent dark:to-emerald-900/20 opacity-50 z-0"></div>
                <div className="relative z-10 p-12 text-center space-y-6 flex flex-col items-center">
                  <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                    Ready to generate your document?
                  </h2>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-md mx-auto leading-relaxed">
                    Sign in with your account and start generating academic documents in under a minute.
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveView(user ? "dashboard" : "login")}
                    className="inline-flex items-center gap-2 px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 font-bold rounded-full shadow-[0_0_20px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-xl transition-all text-sm mt-4"
                  >
                    <span>{user ? "Go to Studio" : "Get Started — It's Free"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </div>
              </section>

              {/* Footer */}
              <footer className="pt-8 pb-8 border-t border-zinc-200 dark:border-zinc-900 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-400 dark:text-zinc-650 gap-4">
                <span>&copy; {new Date().getFullYear()} Assessment Maker — Aurora&apos;s PG College. All rights reserved.</span>
                <div className="flex items-center gap-4">
                  <a
                    href="https://github.com/VIGNESH79899/The_AI_Assessment"
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
              CALLBACK PAGE
              ==================================================== */}
          {activeView === "callback" && (
            <motion.div
              key="callback"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex justify-center py-24"
            >
              <div className="w-full max-w-md bg-white/80 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-8 shadow-xl dark:shadow-2xl space-y-6 text-center relative overflow-hidden flex flex-col items-center justify-center">
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none"></div>
                <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-pink-500/10 rounded-full blur-xl pointer-events-none"></div>
                
                <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <div className="w-12 h-12 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin absolute" />
                  <BrainCircuit className="w-5 h-5 text-indigo-500 animate-pulse" />
                </div>
                
                <div className="space-y-2 relative z-10">
                  <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
                    Completing OAuth Login
                  </h2>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium max-w-[280px] leading-relaxed">
                    Securing your credentials and preparing your dashboard workspace...
                  </p>
                </div>
              </div>
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
                <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-3">
                  <span>
                    {assessmentType === "free_writing" 
                      ? "Free Writing Assessment Studio" 
                      : assessmentType === "literature_survey"
                      ? "AI Literature Survey Studio"
                      : "AI Reflective Journal Studio"}
                  </span>
                  {user?.subscription?.status !== "active" && !user?.trialUsage?.[assessmentType] && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20 border border-emerald-250/30 dark:border-emerald-900/40 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 select-none animate-pulse">
                      <Sparkles className="w-3 h-3" />
                      Free Trial Active
                    </span>
                  )}
                </h1>
                <p className="text-sm text-zinc-555 dark:text-zinc-400 leading-relaxed">
                  {assessmentType === "free_writing"
                    ? "Enter student credentials and academic domain details. Our pipeline will build a comprehensive, dynamically structured academic assessment."
                    : assessmentType === "literature_survey"
                    ? "Search real research papers from Semantic Scholar and arXiv, select the most relevant, and synthesize a structured scholarly literature survey."
                    : "Enter student credentials and subject details. Our pipeline will build a comprehensive, formatted reflective journal document."}
                </p>
              </div>

              <div className="relative">
                {user?.subscription?.status !== "active" && user?.trialUsage?.[assessmentType] && (
                  <div className="absolute inset-0 z-20 backdrop-blur-[6px] bg-zinc-50/50 dark:bg-zinc-950/55 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 flex flex-col items-center justify-center text-center p-6 space-y-5">
                    <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200/50 dark:border-amber-900/40 flex items-center justify-center shadow-sm">
                      <Crown className="w-6 h-6 text-amber-500 animate-pulse" />
                    </div>
                    <div className="space-y-2 max-w-sm">
                      <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
                        Unlock Premium Access
                      </h3>
                      <p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed">
                        You have already used your 1-time free trial for generating a{" "}
                        <span className="font-semibold text-zinc-850 dark:text-zinc-200">
                          {assessmentType.replace("_", " ")}
                        </span>
                        . Subscribe to a premium membership to unlock unlimited generations.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveView("billing")}
                      className="px-6 py-2.5 bg-zinc-900 dark:bg-zinc-100 hover:opacity-90 text-white dark:text-zinc-950 font-semibold rounded-xl text-xs shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <Crown className="w-3.5 h-3.5" />
                      <span>View Subscription Plans</span>
                    </button>
                  </div>
                )}

                <div className={user?.subscription?.status !== "active" && user?.trialUsage?.[assessmentType] ? "pointer-events-none opacity-30 select-none" : ""}>
                  {assessmentType === "free_writing" ? (
                    <FreeWritingForm
                      formData={formData}
                      setFormData={setFormData}
                      onSubmit={handleGenerate}
                      generating={generating}
                      isAiServiceReady={isAiServiceReady}
                      isCheckingReady={isCheckingReady}
                    />
                  ) : assessmentType === "literature_survey" ? (
                    <LiteratureSurveyForm
                      formData={formData}
                      setFormData={setFormData}
                      onSubmit={handleGenerate}
                      generating={generating}
                      selectedPapers={selectedPapers}
                      setSelectedPapers={setSelectedPapers}
                      isAiServiceReady={isAiServiceReady}
                      isCheckingReady={isCheckingReady}
                    />
                  ) : (
                    <ReflectiveJournalForm
                      formData={formData}
                      setFormData={setFormData}
                      onSubmit={handleGenerate}
                      generating={generating}
                      isAiServiceReady={isAiServiceReady}
                      isCheckingReady={isCheckingReady}
                    />
                  )}
                </div>
              </div>
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
                                  onClick={() => handleDeleteHistory(doc._id, doc.documentName)}
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

          {/* ====================================================
              PROFILE PAGE
              ==================================================== */}
          {activeView === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-md mx-auto space-y-6"
            >
              <div className="space-y-1">
                <h1 className="text-2xl font-extrabold tracking-tight">Your Profile</h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Manage your account details and settings.
                </p>
              </div>

              <ProfileForm 
                user={user} 
                setUser={setUser} 
                showToast={showToast} 
              />
            </motion.div>
          )}

          {/* ====================================================
              BILLING (SUBSCRIPTION) PAGE
              ==================================================== */}
          {activeView === "billing" && (
            <motion.div
              key="billing"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8 max-w-4xl mx-auto px-4"
            >
              <div className="space-y-1">
                <h1 className="text-2xl font-extrabold tracking-tight">Subscription Command Center</h1>
                <p className="text-sm text-zinc-555 dark:text-zinc-400">
                  Manage your subscription status, trials, and billing invoices.
                </p>
              </div>

              {/* Current Subscription Status */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-500" />
                  <span>Current Membership Plan</span>
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block">Status</span>
                      <strong className={`text-base font-bold capitalize ${
                        user?.subscription?.status === "active" ? "text-emerald-600 dark:text-emerald-450" : "text-amber-600 dark:text-amber-450"
                      }`}>
                        {user?.subscription?.status === "active" ? "Premium Active Member" : "Free Trial Mode"}
                      </strong>
                    </div>

                    <div>
                      <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block">Plan Details</span>
                      <strong className="text-sm text-zinc-800 dark:text-zinc-200 block capitalize">
                        {user?.subscription?.planKey ? `${user.subscription.planKey.replace("-", " ")} Membership` : "Free Trial Plan"}
                      </strong>
                    </div>

                    {user?.subscription?.currentPeriodEnd && (
                      <div>
                        <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block">Current Period End</span>
                        <strong className="text-sm text-zinc-800 dark:text-zinc-200 block">
                          {new Date(user.subscription.currentPeriodEnd).toLocaleDateString()}
                        </strong>
                      </div>
                    )}
                  </div>

                  {/* Free Trial usage flags */}
                  <div className="p-4 bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-800/80 rounded-xl space-y-3">
                    <span className="text-xs text-zinc-450 font-semibold uppercase tracking-wider block">Trial Document Credits</span>
                    
                    <div className="space-y-2.5">
                      {[
                        { label: "Reflective Journal", key: "reflective_journal" },
                        { label: "Free Writing", key: "free_writing" },
                        { label: "Literature Survey", key: "literature_survey" }
                      ].map((item) => {
                        const used = user?.trialUsage?.[item.key];
                        return (
                          <div key={item.key} className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-zinc-700 dark:text-zinc-300">{item.label}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                              used 
                                ? "bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/30 dark:text-rose-450 dark:border-rose-900/40" 
                                : "bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-450 dark:border-emerald-900/40"
                            }`}>
                              {used ? "Used" : "1 Available"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {user?.subscription?.status === "active" && (
                  <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
                    {/* Auto-renew Switch */}
                    <div className="flex items-center gap-3 mr-auto">
                      <span className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">Auto-Renewal:</span>
                      <button
                        onClick={async () => {
                          try {
                            const newStatus = !user.subscription.autoRenew;
                            const res = await apiRequest("/api/subscriptions/auto-renew", {
                              method: "PATCH",
                              body: JSON.stringify({ autoRenew: newStatus })
                            });
                            if (res.subscription) {
                              setUser({ ...user, subscription: { ...user.subscription, autoRenew: res.subscription.autoRenew } });
                              showToast(`Auto-renewal ${res.subscription.autoRenew ? "enabled" : "disabled"}`, "success");
                            }
                          } catch (err) {
                            showToast(err.message, "error");
                          }
                        }}
                        className={`switch ${user?.subscription?.autoRenew ? "on" : ""}`}
                        aria-label="Toggle auto renew"
                      >
                        <span />
                      </button>
                    </div>

                    <button
                      onClick={async () => {
                        if (!confirm("Are you sure you want to cancel your subscription? You will retain access until the end of your billing cycle.")) return;
                        try {
                          const res = await apiRequest("/api/subscriptions/cancel", { method: "POST" });
                          if (res.subscription) {
                            setUser({ ...user, subscription: res.subscription });
                            showToast("Subscription cancelled successfully", "success");
                          }
                        } catch (err) {
                          showToast(err.message, "error");
                        }
                      }}
                      className="px-4 py-2 border border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 rounded-xl text-xs font-semibold transition-all"
                    >
                      Cancel Membership
                    </button>
                  </div>
                )}
              </div>

              {/* Pricing Cards (if not active, or they want to choose a plan) */}
              <div className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold">Premium Subscription Memberships</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-450 font-medium">Choose a membership plan to unlock unlimited document generation and extra features.</p>
                </div>

                {/* Coupon Code Input */}
                <div className="flex items-center gap-3 max-w-sm">
                  <input
                    type="text"
                    placeholder="ENTER COUPON CODE"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    disabled={applyingCoupon}
                    className="px-4 py-2.5 bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500/80 text-zinc-900 dark:text-zinc-100 uppercase"
                  />
                  <button
                    onClick={async () => {
                      if (!couponCode.trim()) return;
                      setApplyingCoupon(true);
                      try {
                        const res = await apiRequest(`/api/subscriptions/coupons/${couponCode.trim()}`);
                        if (res.coupon) {
                          setAppliedCoupon(res.coupon);
                          showToast(`Coupon applied! ${
                            res.coupon.percentOff 
                              ? `${res.coupon.percentOff}% Off` 
                              : `INR ${res.coupon.amountOffInr} Off`
                          }`, "success");
                        }
                      } catch (err) {
                        showToast(err.message || "Invalid coupon", "error");
                        setAppliedCoupon(null);
                      } finally {
                        setApplyingCoupon(false);
                      }
                    }}
                    disabled={applyingCoupon || !couponCode.trim()}
                    className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-semibold rounded-xl text-xs shadow-sm transition-all flex-shrink-0 disabled:opacity-50"
                  >
                    {applyingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                  </button>
                  {appliedCoupon && (
                    <button
                      onClick={() => {
                        setAppliedCoupon(null);
                        setCouponCode("");
                        showToast("Coupon removed", "info");
                      }}
                      className="text-xs text-zinc-400 hover:text-rose-500 font-semibold"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {[
                    {
                      key: "quarterly",
                      name: "3-Month Membership",
                      price: 399,
                      cadence: "3 months",
                      desc: "Full premium access for 3 months",
                      features: ["Unlimited document generation", "Premium AI generator", "Invoice downloads", "Referral rewards", "Priority generation"]
                    },
                    {
                      key: "half-yearly",
                      name: "6-Month Membership",
                      price: 799,
                      cadence: "6 months",
                      desc: "Full premium access for 6 months",
                      popular: true,
                      features: ["Unlimited document generation", "Premium AI generator", "Advanced analytics", "Priority support", "Invoice downloads"]
                    },
                    {
                      key: "yearly",
                      name: "1-Year Membership",
                      price: 1399,
                      cadence: "year",
                      desc: "Full premium access for 1 year",
                      features: ["Unlimited document generation", "Premium AI generator", "Admin exports", "Concierge onboarding", "Priority support"]
                    }
                  ].map((plan) => {
                    const discount = appliedCoupon 
                      ? (appliedCoupon.percentOff 
                          ? Math.round(plan.price * (appliedCoupon.percentOff / 100)) 
                          : (appliedCoupon.amountOffInr || 0))
                      : 0;
                    const finalPrice = Math.max(0, plan.price - discount);
                    const isCurrentPlan = user?.subscription?.status === "active" && user.subscription.planKey === plan.key;

                    return (
                      <div
                        key={plan.key}
                        className={`pricing-card border relative flex flex-col p-5 bg-white dark:bg-zinc-900/45 rounded-2xl shadow-sm ${
                          plan.popular ? "border-amber-400 ring-2 ring-amber-400/10" : "border-zinc-200 dark:border-zinc-800"
                        } space-y-4 flex flex-col justify-between`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-850 text-zinc-500">
                              {plan.key}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {plan.popular && (
                                <span className="text-[10px] font-extrabold uppercase bg-amber-400 text-zinc-950 px-2 py-0.5 rounded-full">
                                  Popular
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{plan.name}</h3>
                            <p className="text-[11px] text-zinc-400 font-medium">{plan.desc}</p>
                          </div>

                          <div className="price flex items-baseline gap-1.5 whitespace-nowrap">
                            {discount > 0 && (
                              <span className="text-xs text-zinc-400 line-through font-semibold mr-1">
                                INR {plan.price}
                              </span>
                            )}
                            <strong className="text-2xl font-black text-zinc-900 dark:text-white">INR {finalPrice}</strong>
                            <span className="text-xs text-zinc-400">/{plan.cadence}</span>
                          </div>

                          <ul className="text-xs text-zinc-500 space-y-2 border-t border-zinc-105 dark:border-zinc-800 pt-3 pl-0 list-none">
                            {plan.features.map((feat) => (
                              <li key={feat} className="flex items-start gap-1.5 leading-relaxed">
                                <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <button
                          onClick={async () => {
                            if (isCurrentPlan) return;
                            setCheckingOutPlan(plan.key);
                            try {
                              const checkoutRes = await apiRequest("/api/subscriptions/checkout", {
                                method: "POST",
                                body: JSON.stringify({
                                  planKey: plan.key,
                                  couponCode: appliedCoupon?.code
                                })
                              });

                              const { checkout } = checkoutRes;

                              if (checkout.demo) {
                                // Simulate demo checkout verify
                                showToast("Simulating Demo Checkout...", "info");
                                const verifyRes = await apiRequest("/api/subscriptions/verify", {
                                  method: "POST",
                                  body: JSON.stringify({
                                    planKey: plan.key,
                                    razorpay_subscription_id: checkout.subscriptionId
                                  })
                                });
                                if (verifyRes.subscription) {
                                  setUser(verifyRes.user);
                                  showToast("Demo Subscription successful!", "success");
                                  setActiveView("dashboard");
                                }
                              } else {
                                // Open Razorpay Checkout modal
                                const options = {
                                  key: checkout.key,
                                  name: "Assessment Maker Premium",
                                  description: `${plan.name} Subscription`,
                                  handler: async function (response) {
                                    showToast("Verifying signature...", "info");
                                    const verifyRes = await apiRequest("/api/subscriptions/verify", {
                                      method: "POST",
                                      body: JSON.stringify({
                                        planKey: plan.key,
                                        razorpay_subscription_id: response.razorpay_subscription_id || "",
                                        razorpay_order_id: response.razorpay_order_id || "",
                                        razorpay_payment_id: response.razorpay_payment_id || "",
                                        razorpay_signature: response.razorpay_signature || ""
                                      })
                                    });
                                    if (verifyRes.subscription) {
                                      setUser(verifyRes.user);
                                      showToast("Payment successful! Membership active.", "success");
                                      setActiveView("dashboard");
                                    }
                                  },
                                  prefill: {
                                    name: user.name,
                                    email: user.email
                                  },
                                  theme: {
                                    color: "#18181b"
                                  }
                                };

                                if (checkout.subscriptionId) {
                                  options.subscription_id = checkout.subscriptionId;
                                } else if (checkout.orderId) {
                                  options.order_id = checkout.orderId;
                                }

                                const rzp = new window.Razorpay(options);
                                rzp.open();
                              }
                            } catch (err) {
                              showToast(err.message || "Checkout failed", "error");
                            } finally {
                              setCheckingOutPlan(null);
                            }
                          }}
                          disabled={checkingOutPlan !== null || isCurrentPlan}
                          className={`w-full py-2 bg-zinc-950 dark:bg-zinc-100 hover:opacity-90 text-white dark:text-zinc-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 ${
                            isCurrentPlan ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          {checkingOutPlan === plan.key ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <span>{isCurrentPlan ? "Current Plan" : "Choose Plan"}</span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Invoices panel */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold">Billing Invoices</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-450 font-medium">Download your past payment transactions invoices.</p>
                </div>
                
                {loadingInvoices ? (
                  <div className="h-24 w-full border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-100 dark:bg-zinc-900 animate-pulse"></div>
                ) : invoices.length === 0 ? (
                  <div className="p-6 text-center border border-zinc-200/65 dark:border-zinc-800 rounded-2xl text-xs text-zinc-500 font-semibold bg-white dark:bg-zinc-900/35">
                    No billing history or invoices found.
                  </div>
                ) : (
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-xs font-semibold text-zinc-500">
                        <thead>
                          <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                            <th className="px-6 py-3">Invoice Number</th>
                            <th className="px-6 py-3">Issued Date</th>
                            <th className="px-6 py-3">Amount</th>
                            <th className="px-6 py-3 text-right">Download</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-350">
                          {invoices.map((inv) => (
                            <tr key={inv._id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/20">
                              <td className="px-6 py-3.5 font-bold text-zinc-900 dark:text-white">
                                {inv.number}
                              </td>
                              <td className="px-6 py-3.5 font-medium">
                                {new Date(inv.issuedAt || inv.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-3.5 font-bold text-zinc-900 dark:text-white">
                                INR {inv.amountInr}
                              </td>
                              <td className="px-6 py-3.5 text-right">
                                <a
                                  href={`${API_URL}${inv.downloadUrl}?token=${localStorage.getItem("accessToken")}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-3 py-1 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-850 font-semibold text-[10px] text-zinc-650 dark:text-zinc-300 no-underline"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>PDF</span>
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Subtle spacer */}
      <div className="h-16"></div>

      {/* ====================================================
          DELETE CONFIRMATION MODAL
          ==================================================== */}
      <AnimatePresence>
        {deleteConfirm.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            onClick={() => !deleting && setDeleteConfirm({ show: false, id: null, name: "" })}
            onKeyDown={(e) => {
              if (e.key === "Escape" && !deleting) setDeleteConfirm({ show: false, id: null, name: "" });
            }}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl dark:shadow-black/40 overflow-hidden"
            >
              {/* Top accent bar */}
              <div className="h-1 w-full bg-gradient-to-r from-rose-400 via-rose-500 to-pink-500" />

              <div className="p-6 space-y-5">
                {/* Icon + Title */}
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200/50 dark:border-rose-900/40 flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-rose-500 dark:text-rose-400" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
                      Delete Document
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Are you sure you want to delete{" "}
                      <span className="font-semibold text-zinc-700 dark:text-zinc-200">
                        {deleteConfirm.name}
                      </span>
                      ? This action cannot be undone.
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setDeleteConfirm({ show: false, id: null, name: "" })}
                    disabled={deleting}
                    className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={deleting}
                    className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-500 text-white shadow-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
    </div>
  );
}

// ====================================================
// AUTH CARD SUBCOMPONENT
// ====================================================
function AuthCard({ setActiveView, fetchUserProfile, showToast }) {
  const [loading, setLoading] = useState(false);

  return (
    <div className="w-full max-w-md bg-white/80 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-8 shadow-xl dark:shadow-2xl space-y-7 relative overflow-hidden text-center">
      {/* Decorative Orbs Inside Card */}
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none"></div>
      <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-pink-500/10 rounded-full blur-xl pointer-events-none"></div>

      {/* Head */}
      <div className="space-y-2.5 relative z-10">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Sign In to Assessment Maker
        </h2>
        <p className="text-xs text-zinc-550 dark:text-zinc-400 font-medium max-w-xs mx-auto leading-relaxed">
          Use your Google account to login or register. First-time users instantly get a 1-time free trial of every document generation type.
        </p>
      </div>

      {/* Sign In Button */}
      <div className="pt-2 relative z-10">
        <a
          href={`${API_URL}/api/auth/google`}
          onClick={() => setLoading(true)}
          className="flex items-center justify-center gap-3 w-full py-3 px-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl text-zinc-700 dark:text-zinc-300 font-semibold shadow-sm hover:shadow-md transition-all duration-300 no-underline"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-zinc-550" />
          ) : (
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-.14 2.69-2.4 3.7l3.7 2.88c2.16-2 3.75-4.94 3.75-8.43z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.7-2.88c-1.03.69-2.35 1.1-4.26 1.1-3.28 0-6.06-2.22-7.05-5.21L1.24 17.02C3.21 21.09 7.39 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M4.95 14.1c-.25-.76-.4-1.57-.4-2.4s.15-1.64.4-2.4L1.24 6.42C.45 8.1 0 9.97 0 12s.45 3.9 1.24 5.58l3.71-2.48z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.96 1.19 15.24 0 12 0 7.39 0 3.21 2.91 1.24 6.98l3.71 2.48c.99-2.99 3.77-5.21 7.05-5.21z"
              />
            </svg>
          )}
          <span className="text-sm">Continue with Google</span>
        </a>
      </div>
    </div>
  );
}

// ====================================================
// PROFILE FORM SUBCOMPONENT
// ====================================================
function ProfileForm({ user, setUser, showToast }) {
  const [name, setName] = useState(user?.name || "");
  const [avatar, setAvatar] = useState(user?.avatar || user?.avatarUrl || "");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setAvatar(user.avatar || user.avatarUrl || "");
    }
  }, [user]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("Name cannot be empty", "error");
      return;
    }
    setUpdating(true);
    try {
      const data = await apiRequest("/api/auth/profile", {
        method: "PUT",
        body: JSON.stringify({ name, avatar })
      });
      if (data.ok && data.user) {
        setUser(data.user);
        showToast("Profile updated successfully!", "success");
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to update profile.", "error");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <form onSubmit={handleUpdate} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
      {/* Avatar View */}
      <div className="flex flex-col items-center gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="relative w-20 h-20 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center shadow-inner">
          {avatar ? (
            <img src={avatar} alt={name} className="w-full h-full object-cover" />
          ) : (
            <User className="w-8 h-8 text-zinc-400" />
          )}
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-sm font-bold text-zinc-905 dark:text-white">{user?.name}</h3>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">{user?.email}</p>
        </div>
      </div>

      {/* Inputs */}
      <div className="space-y-4">
        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Display Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500/80 focus:ring-4 focus:ring-indigo-500/10 transition-all text-zinc-900 dark:text-zinc-100"
          />
        </div>


        {/* Authentication Provider (Read only) */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Auth Method</label>
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl text-sm text-zinc-500 dark:text-zinc-400 font-medium">
            <span className="capitalize">{user?.provider || "local"}</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-500">
              Active
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <button
        type="submit"
        disabled={updating}
        className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-1.5"
      >
        {updating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <span>Save Changes</span>
        )}
      </button>
    </form>
  );
}
