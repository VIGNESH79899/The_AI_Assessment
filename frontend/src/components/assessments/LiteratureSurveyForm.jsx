import React, { useState, useEffect, useCallback } from "react";
import { 
  User, Calendar, GraduationCap, BookOpen, Sparkles, Loader2, 
  Search, ExternalLink, Check, AlertCircle, FileText, 
  ChevronDown, ChevronUp, Plus, Trash2, MapPin, Building, Award 
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "";

export function LiteratureSurveyForm({ 
  formData, 
  setFormData, 
  onSubmit, 
  generating, 
  selectedPapers, 
  setSelectedPapers 
}) {
  const [searchQuery, setSearchQuery] = useState(formData.topic || "");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [expandedAbstracts, setExpandedAbstracts] = useState({});

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
      const token = localStorage.getItem("accessToken");
      const url = `${API_URL}/api/generator/literature-search?q=${encodeURIComponent(query.trim())}`;
      
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to search papers");
      }
      
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

    // Update the main topic field with the search query
    handleChange("topic", searchQuery);

    const delayDebounceFn = setTimeout(() => {
      performSearch(searchQuery);
    }, 750); // 750ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, performSearch]);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedPapers.length < 1) {
      alert("Please select at least 1 paper (5-10 recommended) to generate the literature survey.");
      return;
    }
    onSubmit(e);
  };

  const studentsList = formData.students || [{ name: "", roll: "" }];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* LEFT COLUMN: The Redesigned Form */}
      <div className="lg:col-span-7 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
          
          {/* SECTION 1: DOCUMENT HEADER */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-800 pb-2">
              SECTION 1 &mdash; DOCUMENT HEADER
            </h2>
            
            <div className="space-y-4">
              {/* Fixed Title Label */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Literature Survey Type</label>
                <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  LITERATURE SURVEY REPORT
                </div>
              </div>

              {/* Primary Highlighted field: Project Title */}
              <div className="space-y-1.5 p-4 bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl">
                <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-zinc-900 dark:text-white" />
                  <span>PROJECT / RESEARCH TITLE *</span>
                </label>
                <textarea
                  placeholder="Enter the main title of your project or research theme (e.g., Deep Learning Methods for Automatic Essay Scoring)"
                  required
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4.5 py-3 bg-white dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-xl text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-zinc-650 dark:focus:ring-zinc-650 transition-all min-h-[75px] text-zinc-900 dark:text-zinc-100 shadow-inner"
                />
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 leading-relaxed">
                  * Note: Changing this title will automatically search for relevant scholarly research papers below.
                </p>
              </div>

              {/* File Name & Academic Year in Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Document File Name</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-650">
                      <FileText className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="e.g., Literature_Survey_AI"
                      required
                      value={formData.document_name || ""}
                      onChange={(e) => handleChange("document_name", e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650 transition-all text-zinc-900 dark:text-zinc-100"
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
                      placeholder="e.g., 2025 - 2026"
                      required
                      value={formData.academic_year || ""}
                      onChange={(e) => handleChange("academic_year", e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650 transition-all text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: UNIVERSITY & DEPARTMENT DETAILS */}
          <div className="space-y-4 pt-2">
            <h2 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-800 pb-2">
              SECTION 2 &mdash; UNIVERSITY &amp; COLLEGE DETAILS
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">University / College Name</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-650">
                    <Building className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={formData.university_name || ""}
                    onChange={(e) => handleChange("university_name", e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650 transition-all text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Department Name</label>
                <input
                  type="text"
                  required
                  value={formData.department_name || ""}
                  onChange={(e) => handleChange("department_name", e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650 transition-all text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">University Location</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-650">
                    <MapPin className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={formData.university_location || ""}
                    onChange={(e) => handleChange("university_location", e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650 transition-all text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: GUIDE DETAILS */}
          <div className="space-y-4 pt-2">
            <h3 className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-800 pb-2">
              SECTION 3 &mdash; GUIDE DETAILS &amp; ESTEEMED GUIDANCE
            </h3>
            
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 italic">
              "Under the esteemed guidance of"
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Guide Full Name</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-650">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="e.g., Dr. Robert Smith"
                    required
                    value={formData.guide_name || ""}
                    onChange={(e) => handleChange("guide_name", e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650 transition-all text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Guide Designation</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-650">
                    <Award className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="e.g., Associate Professor"
                    required
                    value={formData.guide_designation || ""}
                    onChange={(e) => handleChange("guide_designation", e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650 transition-all text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Guide Department</label>
                <input
                  type="text"
                  placeholder="e.g., Dept. of CSE"
                  required
                  value={formData.guide_department || ""}
                  onChange={(e) => handleChange("guide_department", e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650 transition-all text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: STUDENT TEAM DETAILS */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
              <h2 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                SECTION 4 &mdash; STUDENT TEAM DETAILS
              </h2>
              <button
                type="button"
                onClick={addStudent}
                className="flex items-center gap-1 text-[11px] font-bold px-3 py-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 border border-zinc-250/20 rounded-lg transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Add Student
              </button>
            </div>

            <div className="space-y-3">
              {studentsList.map((student, idx) => (
                <div 
                  key={idx}
                  className="flex gap-4 p-4 border border-zinc-200/80 dark:border-zinc-800 rounded-xl bg-zinc-50/25 dark:bg-zinc-950/20 items-end"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                        Student #{idx + 1} Full Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., B. Yash"
                        required
                        value={student.name || ""}
                        onChange={(e) => handleStudentChange(idx, "name", e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650 transition-all text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                        Registration / Roll Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., 241U1R2061"
                        required
                        value={student.roll || ""}
                        onChange={(e) => handleStudentChange(idx, "roll", e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650 transition-all text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={studentsList.length <= 1}
                    onClick={() => removeStudent(idx)}
                    className="p-2 border border-zinc-200 dark:border-zinc-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 rounded-lg transition-all text-zinc-400 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-450"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-relaxed italic">
              * Minimum 1 student required. Dynamic listing allows team projects of up to 5 authors.
            </p>
          </div>

          {/* SECTION 5: RESEARCH PAPER SEARCH */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
              <h2 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                SECTION 5 &mdash; SELECTED RESEARCH PAPERS
              </h2>
              {searching && (
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Querying API...
                </span>
              )}
            </div>

            {/* Selected tracker layout */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-850 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-350">
                  Papers selection count: {selectedPapers.length} / 10
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  selectedPapers.length >= 5 && selectedPapers.length <= 10
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                }`}>
                  {selectedPapers.length < 5 ? "Choose 5–10 recommended" : "Ideal selection"}
                </span>
              </div>
              
              {selectedPapers.length === 0 ? (
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 italic">No papers selected. Search results and toggle papers to add them.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedPapers.map((paper, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-lg text-xs"
                    >
                      <span className="truncate max-w-[150px] font-semibold text-zinc-800 dark:text-zinc-200">{paper.title}</span>
                      <button
                        type="button"
                        onClick={() => togglePaperSelection(paper)}
                        className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-bold"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Search list display */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                Live Search Results
              </h4>

              {searchError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 dark:border-rose-900/50 rounded-xl flex gap-2.5 text-xs text-rose-800 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{searchError}</span>
                </div>
              )}

              {searching && searchResults.length === 0 ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-3.5 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl bg-zinc-50/30 dark:bg-zinc-900/10 space-y-2 animate-pulse">
                      <div className="h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3"></div>
                      <div className="h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : searchResults.length === 0 ? (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 italic text-center py-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                  {searchQuery.trim().length < 3 ? "Enter a research topic in Section 1 to run automated search." : "No results. Refine your research title."}
                </p>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {Array.isArray(searchResults) && searchResults.map((paper, idx) => {
                    const selected = isSelected(paper);
                    const expanded = expandedAbstracts[paper.url];
                    const cleanAbstract = (paper.abstract || "No abstract available.").replace(/\s+/g, ' ').trim();
                    const shortAbstract = cleanAbstract.length > 150 ? cleanAbstract.substring(0, 150) + "..." : cleanAbstract;

                    return (
                      <div 
                        key={idx}
                        onClick={() => togglePaperSelection(paper)}
                        className={`p-3 border rounded-xl transition-all cursor-pointer flex gap-3 items-start ${
                          selected
                            ? "bg-zinc-50/80 dark:bg-zinc-800/25 border-zinc-950 dark:border-zinc-200"
                            : "bg-white dark:bg-zinc-900 border-zinc-205 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-750"
                        }`}
                      >
                        <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                          selected
                            ? "bg-zinc-950 border-zinc-950 text-white dark:bg-zinc-50 dark:border-zinc-50 dark:text-zinc-950"
                            : "border-zinc-350 dark:border-zinc-700 bg-transparent"
                        }`}>
                          {selected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>

                        <div className="flex-1 space-y-1" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-wrap items-start justify-between gap-1.5">
                            <h5 className="text-xs font-bold text-zinc-900 dark:text-white leading-tight">
                              {paper.title}
                            </h5>
                            <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold border capitalize flex-shrink-0 ${
                              paper.source?.toLowerCase().includes("scholar")
                                ? "bg-indigo-50/60 text-indigo-700 border-indigo-200/50 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/50"
                                : "bg-amber-50/60 text-amber-700 border-amber-200/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50"
                            }`}>
                              {paper.source || "Semantic Scholar"}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-zinc-500 dark:text-zinc-500 font-medium">
                            <span>{paper.authors?.length > 0 ? paper.authors.join(", ") : "Unknown"}</span>
                            <span>&bull;</span>
                            <span>{paper.year || "2024"}</span>
                            {paper.url && (
                              <>
                                <span>&bull;</span>
                                <a 
                                  href={paper.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 flex items-center gap-0.5"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  PDF <ExternalLink className="w-2 h-2" />
                                </a>
                              </>
                            )}
                          </div>

                          <div className="text-[10px] text-zinc-550 dark:text-zinc-450 leading-relaxed bg-zinc-50/40 dark:bg-zinc-950/20 p-2 rounded border border-zinc-100 dark:border-zinc-850">
                            <span>{expanded ? cleanAbstract : shortAbstract}</span>
                            {cleanAbstract.length > 150 && (
                              <button
                                type="button"
                                onClick={() => toggleAbstract(paper.url)}
                                className="text-zinc-650 hover:text-zinc-950 dark:text-zinc-450 dark:hover:text-zinc-200 font-bold ml-1"
                              >
                                {expanded ? "Less" : "More"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ACTION FOOTER */}
          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-5 flex items-center justify-between">
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
              Dual-source search and citation validator enabled.
            </span>
            <button
              type="submit"
              disabled={generating || selectedPapers.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-zinc-950 dark:bg-zinc-50 dark:text-zinc-950 text-white rounded-xl text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Survey...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Literature Survey</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* RIGHT COLUMN: The Sticky Live Cover Page Preview */}
      <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
        <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
          <span>Live Cover Page Preview</span>
          <span className="px-2 py-0.5 rounded-full bg-zinc-150 dark:bg-zinc-850 text-[10px] font-normal uppercase normal-case">
            Real-time
          </span>
        </h3>

        {/* Paper visual container */}
        <div className="w-full bg-white text-black p-8 sm:p-12 border border-zinc-250 shadow-lg rounded-xl relative overflow-hidden flex flex-col justify-between aspect-[1/1.4] select-none font-serif min-h-[500px]">
          {/* Double border styling to look like a real academic thesis cover sheet */}
          <div className="absolute inset-2 border border-zinc-150 pointer-events-none"></div>
          <div className="absolute inset-2.5 border-4 double border-zinc-100 pointer-events-none"></div>

          {/* Top header */}
          <div className="text-center space-y-4 z-10">
            <p className="text-[9px] tracking-[0.25em] font-semibold text-zinc-500 font-sans uppercase">
              A Literature Survey Report On
            </p>
            
            <h1 className="text-base sm:text-lg font-bold tracking-normal leading-snug uppercase text-zinc-950 max-h-[120px] overflow-hidden break-words">
              {searchQuery.trim() || "[PROJECT / RESEARCH TITLE]"}
            </h1>
            
            <p className="text-[8px] text-zinc-500 italic max-w-xs mx-auto leading-relaxed">
              Submitted in partial fulfillment of the requirements for the award of the degree of
            </p>
          </div>

          {/* Department details */}
          <div className="text-center space-y-1.5 z-10">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-850 max-w-sm mx-auto">
              {formData.department_name || "[DEPARTMENT NAME]"}
            </p>
            <p className="text-[9px] font-semibold uppercase text-zinc-650 max-w-sm mx-auto">
              {formData.university_name || "[UNIVERSITY / COLLEGE NAME]"}
            </p>
            <p className="text-[8px] tracking-wide text-zinc-500">
              {formData.university_location || "[UNIVERSITY LOCATION]"}
            </p>
          </div>

          {/* Student list */}
          <div className="text-center space-y-2 z-10 max-w-xs mx-auto">
            <p className="text-[8px] font-sans tracking-widest font-semibold uppercase text-zinc-450">
              Submitted by
            </p>
            <div className="space-y-1 text-[9px] font-semibold text-zinc-900 leading-normal font-sans">
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
          <div className="text-center space-y-2 z-10">
            <p className="text-[8px] text-zinc-400 italic">
              Under the esteemed guidance of
            </p>
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-zinc-900">
                {formData.guide_name || "[GUIDE NAME]"}
              </p>
              <p className="text-[8px] font-sans text-zinc-500 leading-tight">
                {formData.guide_designation || "[DESIGNATION]"}, {formData.guide_department || "[DEPARTMENT]"}
              </p>
            </div>
          </div>

          {/* Footer year */}
          <div className="text-center pt-2 border-t border-zinc-100 z-10">
            <p className="text-[9px] font-semibold text-zinc-500 tracking-wide font-sans">
              Academic Year: {formData.academic_year || "[YEAR]"}
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
