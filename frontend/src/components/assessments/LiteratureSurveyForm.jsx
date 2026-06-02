import React, { useState, useEffect, useCallback } from "react";
import { 
  User, Calendar, GraduationCap, BookOpen, Sparkles, Loader2, 
  Search, ExternalLink, Check, AlertCircle, FileText, 
  Plus, Trash2, MapPin, Building, Award, CheckCircle2, ChevronRight, ChevronLeft
} from "lucide-react";

import { apiRequest } from "../../App.jsx";

const API_URL = import.meta.env.VITE_API_URL || "";

export function LiteratureSurveyForm({ 
  formData, 
  setFormData, 
  onSubmit, 
  generating, 
  selectedPapers, 
  setSelectedPapers 
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState(formData.topic || "");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [expandedAbstracts, setExpandedAbstracts] = useState({});
  const [stepErrors, setStepErrors] = useState({});

  // Ensure initial students array exists
  useEffect(() => {
    if (!formData.students || formData.students.length === 0) {
      setFormData(prev => ({
        ...prev,
        students: [{ name: "", roll: "" }]
      }));
    }
  }, [formData.students, setFormData]);

  // Synchronize internal query state with form topic
  useEffect(() => {
    if (formData.topic && formData.topic !== searchQuery) {
      setSearchQuery(formData.topic);
    }
  }, [formData.topic]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleStudentChange = (index, field, value) => {
    const updatedStudents = [...(formData.students || [])];
    updatedStudents[index] = { ...updatedStudents[index], [field]: value };
    handleChange("students", updatedStudents);
  };

  const addStudent = () => {
    const currentStudents = formData.students || [];
    if (currentStudents.length >= 5) {
      alert("Maximum 5 students allowed in an academic literature survey team.");
      return;
    }
    handleChange("students", [...currentStudents, { name: "", roll: "" }]);
  };

  const removeStudent = (index) => {
    const currentStudents = formData.students || [];
    if (currentStudents.length <= 1) {
      alert("A literature survey must have at least 1 student author.");
      return;
    }
    const updatedStudents = currentStudents.filter((_, idx) => idx !== index);
    handleChange("students", updatedStudents);
  };

  // Perform search call to the Express backend proxy
  const performSearch = useCallback(async (query) => {
    if (!query || query.trim().length < 3 || searching) return;
    
    setSearching(true);
    setSearchError("");
    try {
      const data = await apiRequest(`/api/generator/literature-search?q=${encodeURIComponent(query.trim())}`);
      
      const papers = Array.isArray(data.results)
        ? data.results
        : (data.results && Array.isArray(data.results.results)
            ? data.results.results
            : (Array.isArray(data) ? data : []));
      setSearchResults(papers);
    } catch (err) {
      console.error("[SEARCH_ERROR] ", err);
      setSearchError(err.message || "Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  }, [searching]);

  // Debounced effect for automatic search
  useEffect(() => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length < 3) {
      setSearchResults([]);
      return;
    }

    handleChange("topic", searchQuery);

    const delayDebounceFn = setTimeout(() => {
      performSearch(searchQuery);
    }, 800); // 800ms debounce

    return () => clearTimeout(delayDebounceFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const togglePaperSelection = (paper) => {
    const isAlreadySelected = selectedPapers.some(
      p => p.url === paper.url || 
      (p.doi && p.doi === paper.doi) || 
      p.title.toLowerCase() === paper.title.toLowerCase()
    );
    
    if (isAlreadySelected) {
      setSelectedPapers(prev => prev.filter(
        p => !(p.url === paper.url || (p.doi && p.doi === paper.doi) || p.title.toLowerCase() === paper.title.toLowerCase())
      ));
    } else {
      if (selectedPapers.length >= 10) {
        alert("Maximum of 10 selected papers allowed to prevent AI context overflow.");
        return;
      }
      setSelectedPapers(prev => [...prev, paper]);
    }
  };

  const isSelected = (paper) => {
    return selectedPapers.some(
      p => p.url === paper.url || 
      (p.doi && p.doi === paper.doi) || 
      p.title.toLowerCase() === paper.title.toLowerCase()
    );
  };

  const toggleAbstract = (paperUrl) => {
    setExpandedAbstracts(prev => ({
      ...prev,
      [paperUrl]: !prev[paperUrl]
    }));
  };

  const getStepValidation = (step) => {
    if (step === 1) {
      if (!searchQuery.trim()) return "Please enter a Project / Research Title.";
      if (!formData.document_name?.trim()) return "Please enter a Document File Name.";
      if (!formData.academic_year?.trim()) return "Please enter the Academic Year.";
    }
    if (step === 2) {
      if (!formData.university_name?.trim()) return "Please enter the University / College Name.";
      if (!formData.department_name?.trim()) return "Please enter the Department Name.";
      if (!formData.university_location?.trim()) return "Please enter the University Location.";
      if (!formData.guide_name?.trim()) return "Please enter the Guide Advisor Name.";
      if (!formData.guide_designation?.trim()) return "Please enter the Guide Designation.";
      if (!formData.guide_department?.trim()) return "Please enter the Guide Department.";
    }
    if (step === 3) {
      const students = formData.students || [];
      if (students.length === 0) return "Please add at least one student.";
      for (let i = 0; i < students.length; i++) {
        if (!students[i].name?.trim()) return `Please enter the name for Student #${i + 1}.`;
        if (!students[i].roll?.trim()) return `Please enter the registration number for Student #${i + 1}.`;
      }
    }
    if (step === 4) {
      if (selectedPapers.length < 1) return "Please select at least 1 research paper (5-10 recommended) to proceed to review.";
    }
    return null;
  };

  const handleNextStep = () => {
    const error = getStepValidation(currentStep);
    if (error) {
      setStepErrors({ [currentStep]: error });
      return;
    }
    setStepErrors({});
    setCurrentStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    if (generating) return;
    setStepErrors({});
    setCurrentStep(prev => prev - 1);
  };

  const handleStepClick = (stepId) => {
    if (generating) return;
    if (stepId < currentStep) {
      setCurrentStep(stepId);
      setStepErrors({});
    } else {
      // Validate all intermediate steps
      for (let s = currentStep; s < stepId; s++) {
        const error = getStepValidation(s);
        if (error) {
          setStepErrors({ [s]: error });
          setCurrentStep(s);
          return;
        }
      }
      setStepErrors({});
      setCurrentStep(stepId);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalError = getStepValidation(1) || getStepValidation(2) || getStepValidation(3) || getStepValidation(4);
    if (finalError) {
      alert(`Please fix details: ${finalError}`);
      return;
    }
    onSubmit(e);
  };

  const studentsList = formData.students || [{ name: "", roll: "" }];

  const steps = [
    { id: 1, name: "Project Setup", icon: FileText, desc: "Title & Filename" },
    { id: 2, name: "Institution & Guide", icon: Building, desc: "College & Advisor" },
    { id: 3, name: "Student Authors", icon: GraduationCap, desc: "Team Members" },
    { id: 4, name: "Research Papers", icon: BookOpen, desc: "Sources & Search" },
    { id: 5, name: "Preview & Generate", icon: Sparkles, desc: "Final Review" }
  ];

  // Group search results by provider
  const semanticScholarPapers = searchResults.filter(
    p => p.source?.toLowerCase().includes("scholar")
  );
  const arxivPapers = searchResults.filter(
    p => !p.source?.toLowerCase().includes("scholar")
  );

  const renderPaperCard = (paper, idx) => {
    const selected = isSelected(paper);
    const expanded = expandedAbstracts[paper.url];
    const cleanAbstract = (paper.abstract || "No abstract available.").replace(/\s+/g, ' ').trim();
    const shortAbstract = cleanAbstract.length > 180 ? cleanAbstract.substring(0, 180) + "..." : cleanAbstract;

    return (
      <div 
        key={paper.url || idx}
        onClick={() => {
          if (generating) return;
          togglePaperSelection(paper);
        }}
        className={`p-5 border rounded-2xl transition-all duration-200 cursor-pointer flex gap-4 items-start ${
          selected
            ? "bg-zinc-50/80 dark:bg-zinc-800/15 border-zinc-950 dark:border-zinc-200 shadow-sm"
            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-350 dark:hover:border-zinc-700"
        } ${generating ? "opacity-60 pointer-events-none" : ""}`}
      >
        <div className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center flex-shrink-0 transition-all ${
          selected
            ? "bg-zinc-950 border-zinc-950 text-white dark:bg-zinc-50 dark:border-zinc-50 dark:text-zinc-950"
            : "border-zinc-300 dark:border-zinc-700 bg-transparent"
        }`}>
          {selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </div>

        <div className="flex-1 space-y-2.5" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h5 className="text-sm font-bold text-zinc-900 dark:text-white leading-snug max-w-xl">
              {paper.title}
            </h5>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold border uppercase flex-shrink-0 ${
              paper.source?.toLowerCase().includes("scholar")
                ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/50"
                : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50"
            }`}>
              {paper.source || "Scholar"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-zinc-555 dark:text-zinc-450 font-semibold">
            <span>{paper.authors?.length > 0 ? paper.authors.join(", ") : "Unknown Authors"}</span>
            <span>&bull;</span>
            <span>{paper.year || "N/A"}</span>
            {paper.url && (
              <>
                <span>&bull;</span>
                <a 
                  href={paper.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-zinc-450 hover:text-zinc-700 dark:hover:text-zinc-200 flex items-center gap-0.5 font-bold"
                  onClick={(e) => e.stopPropagation()}
                >
                  PDF <ExternalLink className="w-3 h-3" />
                </a>
              </>
            )}
          </div>

          <div className="text-xs text-zinc-650 dark:text-zinc-350 leading-relaxed bg-zinc-50/50 dark:bg-zinc-950/30 p-3.5 rounded-xl border border-zinc-150 dark:border-zinc-850">
            <span>{expanded ? cleanAbstract : shortAbstract}</span>
            {cleanAbstract.length > 180 && (
              <button
                type="button"
                onClick={() => toggleAbstract(paper.url)}
                className="text-zinc-900 dark:text-zinc-50 hover:underline font-bold ml-1.5 focus:outline-none"
              >
                {expanded ? "Show Less" : "Read Full Abstract"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
      
      {/* LEFT COLUMN: Stepper Progress and Form Step View */}
      <div className="lg:col-span-6 space-y-6">
        
        {/* Step Indicator Header */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="relative flex justify-between items-center max-w-xl mx-auto">
            {/* Background Line */}
            <div className="absolute top-[18px] left-0 right-0 h-0.5 bg-zinc-150 dark:bg-zinc-850 z-0" />
            <div 
              className="absolute top-[18px] left-0 h-0.5 bg-zinc-950 dark:bg-zinc-50 z-0 transition-all duration-300"
              style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
            />

            {steps.map((step) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <button
                  key={step.id}
                  type="button"
                  disabled={generating}
                  onClick={() => handleStepClick(step.id)}
                  className="relative z-10 flex flex-col items-center focus:outline-none group disabled:opacity-50"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-300 ${
                    isActive 
                      ? "bg-zinc-950 border-zinc-950 text-white dark:bg-zinc-50 dark:border-zinc-50 dark:text-zinc-950 shadow-md ring-4 ring-zinc-100 dark:ring-zinc-800" 
                      : isCompleted 
                      ? "bg-zinc-100 border-zinc-200 text-zinc-950 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-50" 
                      : "bg-white border-zinc-200 text-zinc-400 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700"
                  }`}>
                    {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : <StepIcon className="w-4 h-4" />}
                  </div>
                  <span className={`text-[10px] font-bold mt-2 tracking-wide uppercase hidden sm:block transition-colors duration-300 ${
                    isActive 
                      ? "text-zinc-900 dark:text-zinc-50" 
                      : isCompleted 
                      ? "text-zinc-650 dark:text-zinc-350" 
                      : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-500"
                  }`}>
                    {step.name}
                  </span>
                </button>
              );
            })}
          </div>
          {/* Subtitle helper showing active workflow stage description */}
          <div className="text-center mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-850">
            <span className="text-[11px] font-bold tracking-widest text-zinc-400 uppercase">
              Workflow Stage {currentStep} &mdash; {steps[currentStep - 1].desc}
            </span>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* STEP 1: PROJECT SETUP */}
          {currentStep === 1 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="border-b border-zinc-100 dark:border-zinc-850 pb-3 flex items-center gap-2.5">
                <div className="p-1.5 bg-zinc-50 dark:bg-zinc-950 rounded-lg text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">
                    STEP 1 &mdash; PROJECT SETUP
                  </h3>
                  <p className="text-[10px] text-zinc-450 dark:text-zinc-500">Define the core literature survey subject and metadata</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Literature Survey Type</label>
                  <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    LITERATURE SURVEY REPORT
                  </div>
                </div>

                <div className="space-y-2.5 p-4.5 bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl">
                  <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-zinc-900 dark:text-white" />
                    <span>PROJECT / RESEARCH TITLE *</span>
                  </label>
                  <textarea
                    disabled={generating}
                    placeholder="Enter the main title of your project or research theme (e.g., The Currents trends in gold manufacturing)"
                    required
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4.5 py-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650 transition-all min-h-[85px] text-zinc-900 dark:text-zinc-100 shadow-inner disabled:opacity-50"
                  />
                  <p className="text-[10px] text-zinc-450 dark:text-zinc-500 leading-relaxed">
                    * Changing this title will automatically update search queries and lookup relevant research papers.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Document File Name</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-650">
                        <FileText className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        disabled={generating}
                        placeholder="e.g., Literature_Survey_Gold"
                        required
                        value={formData.document_name || ""}
                        onChange={(e) => handleChange("document_name", e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650 transition-all text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Academic Year</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-650">
                        <Calendar className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        disabled={generating}
                        placeholder="e.g., 2026 - 2027"
                        required
                        value={formData.academic_year || ""}
                        onChange={(e) => handleChange("academic_year", e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650 transition-all text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: INSTITUTION & GUIDE DETAILS */}
          {currentStep === 2 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="border-b border-zinc-100 dark:border-zinc-850 pb-3 flex items-center gap-2.5">
                <div className="p-1.5 bg-zinc-50 dark:bg-zinc-950 rounded-lg text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">
                    STEP 2 &mdash; INSTITUTION &amp; GUIDE DETAILS
                  </h3>
                  <p className="text-[10px] text-zinc-450 dark:text-zinc-500">Provide college credentials and guiding faculty advisor info</p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-4 p-4.5 bg-zinc-50/20 dark:bg-zinc-950/10 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl space-y-4">
                  <span className="text-[10px] font-extrabold text-zinc-400 tracking-wider uppercase">College Affiliation</span>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">University / College Name</label>
                    <input
                      type="text"
                      disabled={generating}
                      required
                      value={formData.university_name || ""}
                      onChange={(e) => handleChange("university_name", e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650 transition-all text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Department Name</label>
                      <input
                        type="text"
                        disabled={generating}
                        required
                        value={formData.department_name || ""}
                        onChange={(e) => handleChange("department_name", e.target.value)}
                        className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650 transition-all text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">University Location</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-650">
                          <MapPin className="w-4 h-4" />
                        </span>
                        <input
                          type="text"
                          disabled={generating}
                          required
                          value={formData.university_location || ""}
                          onChange={(e) => handleChange("university_location", e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650 transition-all text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-4.5 bg-zinc-50/20 dark:bg-zinc-950/10 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl">
                  <span className="text-[10px] font-extrabold text-zinc-400 tracking-wider uppercase">Project Mentor (Guide)</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Guide Advisor Name</label>
                      <input
                        type="text"
                        disabled={generating}
                        placeholder="e.g., Ms. Nuzhath Farhana"
                        required
                        value={formData.guide_name || ""}
                        onChange={(e) => handleChange("guide_name", e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650 transition-all text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Advisor Designation</label>
                      <input
                        type="text"
                        disabled={generating}
                        placeholder="e.g., Assistant Professor"
                        required
                        value={formData.guide_designation || ""}
                        onChange={(e) => handleChange("guide_designation", e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650 transition-all text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Advisor Department</label>
                      <input
                        type="text"
                        disabled={generating}
                        placeholder="e.g., DEPARTMENT OF CSE"
                        required
                        value={formData.guide_department || ""}
                        onChange={(e) => handleChange("guide_department", e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650 transition-all text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: STUDENT TEAM DETAILS */}
          {currentStep === 3 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="border-b border-zinc-100 dark:border-zinc-850 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-zinc-50 dark:bg-zinc-950 rounded-lg text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">
                      STEP 3 &mdash; STUDENT TEAM DETAILS
                    </h3>
                    <p className="text-[10px] text-zinc-450 dark:text-zinc-500">Add or manage authors submitting this literature survey</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={generating}
                  onClick={addStudent}
                  className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-950 hover:opacity-90 rounded-xl transition-all disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Student
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {studentsList.map((student, idx) => (
                    <div 
                      key={idx}
                      className="flex gap-4 p-4 border border-zinc-200/80 dark:border-zinc-800 rounded-xl bg-zinc-50/25 dark:bg-zinc-950/20 items-end hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                            Student #{idx + 1} Name
                          </label>
                          <input
                            type="text"
                            disabled={generating}
                            placeholder="e.g., Vignesh Kumar"
                            required
                            value={student.name || ""}
                            onChange={(e) => handleStudentChange(idx, "name", e.target.value)}
                            className="w-full px-3.5 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650 transition-all text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                            Roll / Registration ID
                          </label>
                          <input
                            type="text"
                            disabled={generating}
                            placeholder="e.g., 241U1R2089"
                            required
                            value={student.roll || ""}
                            onChange={(e) => handleStudentChange(idx, "roll", e.target.value)}
                            className="w-full px-3.5 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650 transition-all text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={studentsList.length <= 1 || generating}
                        onClick={() => removeStudent(idx)}
                        className="p-2 border border-zinc-200 dark:border-zinc-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 rounded-lg transition-all text-zinc-400 disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-relaxed italic">
                  * Minimum 1 author required. Up to 5 authors can be designated for a group project.
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: RESEARCH PAPER SELECTION */}
          {currentStep === 4 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="border-b border-zinc-100 dark:border-zinc-850 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-zinc-50 dark:bg-zinc-950 rounded-lg text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">
                      STEP 4 &mdash; RESEARCH PAPERS
                    </h3>
                    <p className="text-[10px] text-zinc-450 dark:text-zinc-500">Query semantic databases and check 5 to 10 articles</p>
                  </div>
                </div>
                {searching && (
                  <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1 bg-zinc-50 dark:bg-zinc-950 px-2.5 py-1 border border-zinc-200 dark:border-zinc-800 rounded-lg animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin text-zinc-900 dark:text-white" /> Searching APIs...
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {/* Selection Counter and Pill Tags */}
                <div className="p-4 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-850 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-355">
                      Selected Articles: {selectedPapers.length} / 10
                    </span>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      selectedPapers.length >= 5 && selectedPapers.length <= 10
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                        : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                    }`}>
                      {selectedPapers.length < 5 ? "5–10 papers recommended" : "Ideal Selection"}
                    </span>
                  </div>
                  
                  {selectedPapers.length === 0 ? (
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 italic">No papers selected yet. Search and select items below.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedPapers.map((paper, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-lg text-xs hover:border-rose-200 dark:hover:border-rose-900/50 hover:bg-rose-50/50 dark:hover:bg-rose-950/10 transition-colors group cursor-pointer"
                          onClick={() => !generating && togglePaperSelection(paper)}
                        >
                          <span className="truncate max-w-[170px] font-semibold text-zinc-800 dark:text-zinc-200">{paper.title}</span>
                          {!generating && <span className="text-zinc-400 group-hover:text-rose-500 transition-colors font-bold">&times;</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Live Search List */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5" />
                      <span>Search Results matching title</span>
                    </div>
                    {searchResults.length > 0 && (
                      <span>{searchResults.length} articles found</span>
                    )}
                  </div>

                  {searchError && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/50 rounded-xl flex gap-2.5 text-xs text-rose-800 dark:text-rose-350">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{searchError}</span>
                    </div>
                  )}

                  {searching && searchResults.length === 0 ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="p-5 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl bg-zinc-50/30 dark:bg-zinc-900/10 space-y-3 animate-pulse">
                          <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4"></div>
                          <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2"></div>
                          <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded w-full"></div>
                        </div>
                      ))}
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="text-xs text-zinc-400 dark:text-zinc-500 italic text-center py-8 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/20 dark:bg-zinc-950/10">
                      {searchQuery.trim().length < 3 ? "Provide a project title in Step 1 to load dynamic database search." : "No papers found. Refine your title details."}
                    </div>
                  ) : (
                    <div className="space-y-6 max-h-[480px] overflow-y-auto pr-1">
                      
                      {/* Group 1: Semantic Scholar Results */}
                      {semanticScholarPapers.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-1.5 px-1 pb-1 border-b border-zinc-100 dark:border-zinc-850">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                              Semantic Scholar Database ({semanticScholarPapers.length})
                            </span>
                          </div>
                          <div className="space-y-3">
                            {semanticScholarPapers.map((paper, idx) => renderPaperCard(paper, idx))}
                          </div>
                        </div>
                      )}

                      {/* Group 2: arXiv Results */}
                      {arxivPapers.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-1.5 px-1 pb-1 border-b border-zinc-100 dark:border-zinc-850">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                              arXiv Repository ({arxivPapers.length})
                            </span>
                          </div>
                          <div className="space-y-3">
                            {arxivPapers.map((paper, idx) => renderPaperCard(paper, idx))}
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: PREVIEW & GENERATE */}
          {currentStep === 5 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="border-b border-zinc-100 dark:border-zinc-850 pb-3 flex items-center gap-2.5">
                <div className="p-1.5 bg-zinc-50 dark:bg-zinc-950 rounded-lg text-zinc-950 dark:text-zinc-50 border border-zinc-200 dark:border-zinc-800">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">
                    STEP 5 &mdash; PREVIEW &amp; GENERATE
                  </h3>
                  <p className="text-[10px] text-zinc-450 dark:text-zinc-500">Review generated survey configurations before compiling document</p>
                </div>
              </div>

              {/* Comprehensive Summary Cards */}
              <div className="space-y-4">
                
                {/* 1. Project info */}
                <div className="p-4 bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl space-y-2.5">
                  <div className="flex items-center gap-2 text-zinc-450 dark:text-zinc-500">
                    <FileText className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Project details</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-zinc-400 font-medium">Project Title:</p>
                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug">{searchQuery}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-1 text-xs">
                    <div>
                      <span className="text-zinc-455">File Name:</span>
                      <span className="ml-1 font-semibold text-zinc-800 dark:text-zinc-200">{formData.document_name}</span>
                    </div>
                    <div>
                      <span className="text-zinc-455">Academic Year:</span>
                      <span className="ml-1 font-semibold text-zinc-800 dark:text-zinc-200">{formData.academic_year}</span>
                    </div>
                  </div>
                </div>

                {/* 2. College & Guide details */}
                <div className="p-4 bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-zinc-455 dark:text-zinc-500">
                    <Building className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Institutional affiliation &amp; Guide</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs leading-relaxed">
                    <div className="space-y-1">
                      <span className="text-zinc-400 block">Institution:</span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formData.university_name}</span>
                      <span className="text-zinc-500 block text-[11px]">{formData.department_name} ({formData.university_location})</span>
                    </div>
                    <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-zinc-200/60 dark:border-zinc-800/60 pt-2 sm:pt-0 sm:pl-3">
                      <span className="text-zinc-400 block">Guided Advisor:</span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formData.guide_name}</span>
                      <span className="text-zinc-500 block text-[11px]">{formData.guide_designation}, {formData.guide_department}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Student details */}
                <div className="p-4 bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl space-y-2.5">
                  <div className="flex items-center gap-2 text-zinc-455 dark:text-zinc-500">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Student Authors ({studentsList.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {studentsList.map((std, i) => (
                      <div key={i} className="flex justify-between items-center bg-white dark:bg-zinc-900 px-3 py-1.5 border border-zinc-150 dark:border-zinc-850 rounded-lg text-xs">
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">{std.name}</span>
                        <span className="text-zinc-400 font-mono text-[11px]">{std.roll}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Selected papers */}
                <div className="p-4 bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl space-y-2.5">
                  <div className="flex items-center gap-2 text-zinc-455 dark:text-zinc-500">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Selected Scholarly References ({selectedPapers.length})</span>
                  </div>
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {selectedPapers.map((paper, i) => (
                      <div key={i} className="flex gap-2 items-start text-xs">
                        <span className="text-zinc-400 font-bold">{i + 1}.</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200 leading-snug">{paper.title}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Validation Warnings (Inline, Non-blocking) */}
          {stepErrors[currentStep] && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl flex gap-2 text-xs text-amber-800 dark:text-amber-300 items-center transition-all duration-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="font-semibold">{stepErrors[currentStep]}</span>
            </div>
          )}

          {/* Step Navigation Controls Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            {currentStep > 1 ? (
              <button
                type="button"
                disabled={generating}
                onClick={handlePrevStep}
                className="px-5 py-2.5 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-900 text-zinc-900 dark:text-zinc-50 border border-zinc-205 dark:border-zinc-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <div /> // Spacer
            )}

            {currentStep < 5 ? (
              <button
                type="button"
                disabled={generating}
                onClick={handleNextStep}
                className="px-6 py-2.5 bg-zinc-950 dark:bg-zinc-50 dark:text-zinc-950 text-white rounded-xl text-xs font-bold hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-1 disabled:opacity-50"
              >
                Next Step <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={generating || selectedPapers.length === 0}
                className="flex items-center gap-2 px-6 py-3 bg-zinc-950 dark:bg-zinc-50 dark:text-zinc-950 text-white rounded-xl text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 shadow-md"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Synthesizing Literature Survey...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Survey ({selectedPapers.length} References)</span>
                  </>
                )}
              </button>
            )}
          </div>
          
        </form>
      </div>

      {/* RIGHT COLUMN: Sticky Real-time Academic Cover Preview */}
      <div className="lg:col-span-6 lg:sticky lg:top-24 space-y-4">
        <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 pl-1">
          <span>Live Cover Page Preview</span>
          <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-850 text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Real-time
          </span>
        </h3>

        {/* Paper visual container */}
        <div className="w-full bg-white text-black p-10 sm:p-14 border border-zinc-250 shadow-xl rounded-2xl relative overflow-hidden flex flex-col justify-between select-none font-serif min-h-[680px]">
          {/* Double border styling to look like a real academic thesis cover sheet */}
          <div className="absolute inset-2 border border-zinc-150 pointer-events-none"></div>
          <div className="absolute inset-2.5 border-4 border-double border-zinc-100 pointer-events-none"></div>

          {/* Top header */}
          <div className="text-center space-y-4 z-10">
            <p className="text-[10px] tracking-[0.25em] font-semibold text-zinc-500 font-sans uppercase">
              A Literature Survey Report On
            </p>
            
            <h1 className="text-lg sm:text-xl font-bold tracking-normal leading-snug uppercase text-zinc-950 max-h-[140px] overflow-hidden break-words">
              {searchQuery.trim() || "[PROJECT / RESEARCH TITLE]"}
            </h1>
            
            <p className="text-[10px] text-zinc-500 italic max-w-xs mx-auto leading-relaxed">
              Submitted in partial fulfillment of the requirements for the award of the degree of
            </p>
          </div>

          {/* Center Institution emblem placeholder */}
          <div className="flex justify-center my-0.5 z-10">
            <div className="w-16 h-16 rounded-full border border-zinc-300 flex flex-col items-center justify-center bg-zinc-50 text-zinc-400 font-sans font-bold text-[11px] tracking-wider shadow-inner">
              <span className="leading-none text-zinc-450">APC</span>
              <span className="text-[6px] tracking-normal text-zinc-400 font-normal">EMBLEM</span>
            </div>
          </div>

          {/* Department details */}
          <div className="text-center space-y-1 z-10">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-850 max-w-sm mx-auto leading-tight">
              {formData.department_name || "[DEPARTMENT NAME]"}
            </p>
            <p className="text-[10px] font-semibold uppercase text-zinc-650 max-w-sm mx-auto leading-tight">
              {formData.university_name || "[UNIVERSITY / COLLEGE NAME]"}
            </p>
            <p className="text-[9px] tracking-wide text-zinc-500">
              {formData.university_location || "[UNIVERSITY LOCATION]"}
            </p>
          </div>

          {/* Student list */}
          <div className="text-center space-y-2 z-10 max-w-xs mx-auto">
            <p className="text-[9px] font-sans tracking-widest font-semibold uppercase text-zinc-450">
              Submitted by
            </p>
            <div className="space-y-1 text-[10px] font-semibold text-zinc-900 leading-normal font-sans">
              {studentsList.map((student, idx) => {
                const name = student.name?.trim() || `Student ${idx + 1}`;
                const roll = student.roll?.trim() ? `(${student.roll.trim()})` : "(Roll Number)";
                return (
                  <div key={idx} className="flex justify-center gap-1.5">
                    <span>{name}</span>
                    <span className="text-zinc-500">{roll}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Guide list */}
          <div className="text-center space-y-1.5 z-10">
            <p className="text-[10px] text-zinc-400 italic">
              Under the esteemed guidance of
            </p>
            <div className="space-y-0.5">
              <p className="text-[11px] font-bold text-zinc-900">
                {formData.guide_name || "[GUIDE NAME]"}
              </p>
              <p className="text-[10px] font-sans text-zinc-500 leading-tight">
                {formData.guide_designation || "[DESIGNATION]"}, {formData.guide_department || "[DEPARTMENT]"}
              </p>
            </div>
          </div>

          {/* Footer year */}
          <div className="text-center pt-2 border-t border-zinc-100 z-10">
            <p className="text-[10px] font-semibold text-zinc-500 tracking-wide font-sans">
              Academic Year: {formData.academic_year || "[YEAR]"}
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
