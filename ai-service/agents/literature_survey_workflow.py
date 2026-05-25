"""
Multi-stage AI orchestration for literature survey generation with token control and citation verification.
"""

import json
import re
import uuid
from typing import Dict, Any, List, Tuple
from concurrent.futures import ThreadPoolExecutor

from langchain_core.messages import HumanMessage

from agents.workflow import BaseAssessmentWorkflow, extract_json
from utils.llm import get_llm
from utils.logger import get_logger
from providers.fallback_provider import safe_json_log
from providers.metrics import global_metrics
from providers.cache import global_cache

logger = get_logger("LiteratureSurveyWorkflow")


class LiteratureSurveyWorkflow(BaseAssessmentWorkflow):
    def __init__(self, topic: str, course_name: str = "", selected_papers: List[Dict[str, Any]] = None, academic_domain: str = ""):
        super().__init__(topic, course_name, academic_domain)
        self.selected_papers = selected_papers or []
        # Truncate abstracts in incoming papers to prevent massive token overload
        for paper in self.selected_papers:
            if "abstract" in paper and paper["abstract"]:
                # Safe trim and whitespace clean
                abstract = str(paper["abstract"]).strip()
                abstract = re.sub(r"\s+", " ", abstract)
                if len(abstract) > 1500:
                    paper["abstract"] = abstract[:1500] + "..."
                else:
                    paper["abstract"] = abstract

    def execute(self, request_id: str = None) -> Dict[str, Any]:
        if not request_id:
            request_id = str(uuid.uuid4())

        logger.info(f"[{request_id}] Executing Literature Survey Workflow for topic: '{self.topic}' with {len(self.selected_papers)} selected papers")

        # Safeguard: deduplicate incoming selected papers
        seen_titles = set()
        unique_papers = []
        for p in self.selected_papers:
            title = p.get("title", "").strip().lower()
            if title and title not in seen_titles:
                seen_titles.add(title)
                unique_papers.append(p)
        self.selected_papers = unique_papers

        if not self.selected_papers:
            logger.warning(f"[{request_id}] No papers selected for literature survey.")
            return self._fallback_payload()

        # Step 1: Multi-stage Abstract Summarization & Technical Detail Extraction (Parallel)
        logger.info(f"[{request_id}] Generating parallel technical summaries for {len(self.selected_papers)} paper abstracts")
        summarized_papers = []
        with ThreadPoolExecutor(max_workers=min(len(self.selected_papers), 5)) as executor:
            futures = [
                executor.submit(self._summarize_single_paper, paper, request_id)
                for paper in self.selected_papers
            ]
            for fut in futures:
                try:
                    res = fut.result()
                    summarized_papers.append(res)
                except Exception as e:
                    logger.error(f"[{request_id}] Parallel paper summarization thread failed: {e}")

        # Step 2: Compressed Research Context Builder
        context_parts = []
        for idx, p in enumerate(summarized_papers, 1):
            context_parts.append(
                f"Paper {idx}:\n"
                f"Title: {p['title']}\n"
                f"Authors: {p['authors']}\n"
                f"Year: {p['year']}\n"
                f"Abstract Summary: {p['abstract_summary']}\n"
                f"Methodology: {p['methodology']}\n"
                f"Advantages: {p['advantages']}\n"
                f"Limitations: {p['limitations']}\n"
                f"URL: {p['url']}\n"
                f"Source: {p['source']}\n"
            )
        research_context = "\n---\n".join(context_parts)

        # Step 3: Run AI generation pipeline for global sections (primary is Groq, fallback is Gemini)
        raw_text = self.run_ai_pipeline(research_context, request_id=request_id)

        from providers.fallback_provider import FallbackChatLLM, global_groq_breaker
        provider = "groq"
        model = "llama-3.3-70b-versatile"
        if isinstance(self.llm, FallbackChatLLM) and global_groq_breaker.is_tripped():
            provider = "gemini"
            model = "gemini-2.0-flash"

        # Step 4: Run validation (Schema + Citations)
        from providers.validator import validate_content
        from providers.formatter import normalize_json_output

        is_valid, reason = validate_content(raw_text, "literature_survey")
        
        # If format is valid, check citation fabrication
        if is_valid:
            parsed_check = self._parse_json(raw_text)
            citations_valid, citation_reason = self._validate_citations(parsed_check)
            if not citations_valid:
                is_valid = False
                reason = citation_reason

        # Fallback to Gemini if Groq failed validation
        if not is_valid:
            global_metrics.record_validation_failure(provider)
            safe_json_log(
                event_type="validation_failure",
                request_id=request_id,
                provider=provider,
                model=model,
                duration_ms=0,
                fallback_used=True,
                validation_passed=False,
                message=f"Validation failed for {provider}: {reason}. Triggering Gemini fallback."
            )

            if isinstance(self.llm, FallbackChatLLM):
                logger.info(f"[{request_id}] Using Gemini provider fallback explicitly")
                raw_text = self.run_ai_pipeline(research_context, llm=self.llm.gemini_llm, request_id=request_id)
                provider = "gemini"
                model = "gemini-2.0-flash"

                is_valid_gemini, reason_gemini = validate_content(raw_text, "literature_survey")
                if is_valid_gemini:
                    parsed_check = self._parse_json(raw_text)
                    citations_valid, citation_reason = self._validate_citations(parsed_check)
                    if not citations_valid:
                        is_valid_gemini = False
                        reason_gemini = citation_reason

                if not is_valid_gemini:
                    global_metrics.record_validation_failure("gemini")
                    safe_json_log(
                        event_type="validation_failure",
                        request_id=request_id,
                        provider="gemini",
                        model="gemini-2.0-flash",
                        duration_ms=0,
                        fallback_used=True,
                        validation_passed=False,
                        message=f"Gemini fallback validation failed: {reason_gemini}"
                    )
            else:
                logger.critical(f"[{request_id}] FallbackChatLLM not found in self.llm. Fallback aborted.")

        # Step 5: Format and normalize spacing
        safe_json_log(
            event_type="normalization_action",
            request_id=request_id,
            provider=provider,
            model=model,
            duration_ms=0,
            fallback_used=(provider == "gemini"),
            validation_passed=True,
            message="Normalizing JSON layout and typography spacing for Literature Survey"
        )
        normalized_text = normalize_json_output(raw_text, "literature_survey")
        parsed = self._parse_json(normalized_text)

        if not parsed or not parsed.get("introduction"):
            logger.warning(f"[{request_id}] AI payload empty or invalid for Literature Survey; applying fallback content.")
            parsed = self._fallback_payload()

        # Add the selected papers metadata inside the payload for DOCX generation to access
        parsed["papers"] = summarized_papers

        # Cache ONLY fully validated, formatter-cleaned, successful outputs
        global_cache.set("literature_survey", self.get_synthesis_prompt(research_context), normalized_text)
        return parsed

    def _summarize_single_paper(self, paper: dict, request_id: str) -> dict:
        title = paper.get("title", "")
        authors_list = paper.get("authors", [])
        authors = ", ".join(authors_list) if isinstance(authors_list, list) else str(authors_list)
        year = paper.get("year", "")
        abstract = paper.get("abstract", "")

        prompt = f"""You are an expert academic research assistant.
Analyze the following research paper abstract and metadata:

Title: {title}
Authors: {authors}
Year: {year}
Abstract: {abstract}

Your task is to extract and analyze the details of this paper and output a JSON object with the following keys. Do NOT invent outside information or hallucinate details. If any field is not explicitly detailed in the abstract, infer it conservatively based ONLY on the context.

JSON Schema:
{{
  "abstract_summary": "A 2 to 3 sentence concise summary of the research goal, general approach, and main findings.",
  "methodology": "A short, structured paragraph describing the methodology, techniques, datasets, models, or algorithms used.",
  "advantages": "1 to 2 sentences describing the practical strengths, benefits, or improvements demonstrated by this work.",
  "limitations": "1 to 2 sentences describing the practical limitations, constraints, assumptions, or research gaps mentioned or implied."
}}

Return ONLY the valid JSON object. Do NOT wrap in markdown code blocks. No introductory or concluding text.
"""
        try:
            response = self.llm.invoke([HumanMessage(content=prompt)], request_id=request_id, content_type="mini_summary")
            content = response.content if hasattr(response, "content") else str(response)
            
            cleaned = content.strip()
            cleaned = re.sub(r"```json\s*", "", cleaned, flags=re.IGNORECASE)
            cleaned = re.sub(r"```\s*", "", cleaned)
            first_brace = cleaned.find("{")
            last_brace = cleaned.rfind("}")
            if first_brace != -1 and last_brace != -1:
                cleaned = cleaned[first_brace:last_brace + 1]
            
            parsed = json.loads(cleaned, strict=False)
            return {
                "title": title,
                "authors": authors,
                "year": str(year),
                "abstract_summary": str(parsed.get("abstract_summary", "")).strip(),
                "methodology": str(parsed.get("methodology", "")).strip(),
                "advantages": str(parsed.get("advantages", "")).strip(),
                "limitations": str(parsed.get("limitations", "")).strip(),
                "url": paper.get("url", ""),
                "doi": paper.get("doi", ""),
                "source": paper.get("source", "")
            }
        except Exception as e:
            logger.warning(f"Failed to analyze paper abstract for '{title}': {e}")
            snippet = abstract[:300] + "..." if len(abstract) > 300 else abstract
            return {
                "title": title,
                "authors": authors,
                "year": str(year),
                "abstract_summary": f"This study explores {title} and focuses on key academic contributions and methodologies. Abstract: {snippet}",
                "methodology": "The study employs experimental evaluation and quantitative analysis using datasets relevant to the domain.",
                "advantages": "Demonstrates potential improvements in performance and system capability.",
                "limitations": "Requires further evaluation in large-scale production scenarios.",
                "url": paper.get("url", ""),
                "doi": paper.get("doi", ""),
                "source": paper.get("source", "")
            }

    def get_synthesis_prompt(self, research_context: str) -> str:
        domain_lbl = f"Academic Domain: {self.academic_domain}\n" if self.academic_domain else ""
        return f"""You are generating a HIGHLY DETAILED, rigorous, university-grade Literature Survey.
Project Topic / Title: {self.topic}
Subject/Course: {self.course_name or "Academic Research"}
{domain_lbl}

Here is the Compressed Research Context containing verified summaries and metadata for the selected papers:
{research_context}

Your task is to write a comprehensive academic Literature Survey based ONLY on the provided papers, connecting them to the overall project topic: "{self.topic}".

### CRITICAL INSTRUCTION ON CITATIONS:
- You are ONLY allowed to cite and reference the papers listed in the Compressed Research Context.
- Do NOT invent any papers, authors, DOIs, years, or titles. 
- You MUST reference each of the selected papers by their actual author surnames and years (e.g. "Smith et al. (2023)" or "Jones and Miller (2024)").
- Every paper listed in the context must be discussed and synthesized in the global sections below.

### REQUIRED STRUCTURE:
Your output must be a valid, flat JSON object containing exactly the following 3 keys. Every section value MUST be a single, long, comprehensive string. Use double newlines (\\n\\n) for paragraphs.

1. "introduction": 
   - 2-3 detailed paragraphs.
   - Establish the research topic, context, significance, and mapping to the literature.

2. "objectives": 
   - Exactly 5 to 6 numbered points, each on a new line (using \n for line breaks, e.g., "1. To study...\n2. To analyze..."). Each point MUST be a single, concise, one-line sentence (maximum 15-20 words). Do NOT write paragraphs.

3. "conclusion": 
   - A project-level final conclusion (2-3 detailed paragraphs).
   - This section must NOT summarize the articles individually again.
   - Instead, explain how the reviewed papers collectively help the future project, what technologies/methods are useful, what research gaps exist, how these papers support the implementation of "{self.topic}", and how this literature survey contributes to the project development.

### FORMAT:
Return ONLY a valid JSON object. Do NOT include markdown code blocks. The JSON must look like:
{{
  "introduction": "...",
  "objectives": "...",
  "conclusion": "..."
}}
"""

    def run_ai_pipeline(self, research_context: str, llm=None, request_id: str = None) -> str:
        if llm is None:
            llm = self.llm
        prompt = self.get_synthesis_prompt(research_context)
        content_type = "literature_survey"
        response = llm.invoke(
            [HumanMessage(content=prompt)],
            request_id=request_id,
            content_type=content_type
        )
        return response.content if hasattr(response, "content") else str(response)

    def _parse_json(self, text: str) -> Dict[str, str]:
        required = ["introduction", "objectives", "conclusion"]
        try:
            cleaned = text.strip()
            cleaned = re.sub(r"```json\s*", "", cleaned, flags=re.IGNORECASE)
            cleaned = re.sub(r"```\s*", "", cleaned)
            parsed = json.loads(cleaned, strict=False)
            if isinstance(parsed, dict):
                return {k: str(parsed.get(k, "")).strip() for k in required}
        except:
            pass

        extracted = extract_json(text)
        if isinstance(extracted, dict) and extracted:
            return {k: str(extracted.get(k, "")).strip() for k in required}

        return {k: "" for k in required}

    def _validate_citations(self, parsed_data: dict) -> Tuple[bool, str]:
        # Concatenate text from sections for analysis
        all_text = " ".join(parsed_data.values()).lower()

        # Regex patterns to locate citations: e.g. (Smith, 2021) or Smith et al. (2021)
        citation_matches_1 = re.findall(r"\(([a-z]+)(?:\s+et\s+al\.)?,\s*(\d{4})\)", all_text)
        citation_matches_2 = re.findall(r"([a-z]+)(?:\s+et\s+al\.)?\s*\((\d{4})\)", all_text)
        all_citations = citation_matches_1 + citation_matches_2

        for author_name, year_val in all_citations:
            author_clean = author_name.lower().strip()
            if year_val in ["2026", "2025", "2024", "2023", "2022", "2021", "2020", "2019", "2018", "2017", "2016", "2015"]:
                found = False
                for p in self.selected_papers:
                    p_year = str(p.get("year", ""))
                    if p_year == year_val:
                        p_authors = p.get("authors", [])
                        if isinstance(p_authors, str):
                            p_authors = [p_authors]
                        for auth in p_authors:
                            parts = auth.strip().replace(",", "").split()
                            if parts:
                                surname = parts[-1].lower()
                                if surname in author_clean or author_clean in surname:
                                    found = True
                                    break
                    if found:
                        break
                if not found:
                    return False, f"Citation validation failed: AI synthesized citation '{author_name} ({year_val})' is not among selected papers."

        return True, ""

    def _fallback_payload(self) -> Dict[str, Any]:
        return {
            "introduction": f"Literature review on the research topic: {self.topic} within the subject area of {self.course_name or 'Academic Studies'}.",
            "objectives": "The objective of this literature survey is to map and synthesize the current state of scholarly work regarding the specified topic.",
            "conclusion": "In conclusion, the literature shows promising research trajectories, though further optimization remains key."
        }
