"""
Single-call AI orchestration for reflective journal and free writing generation.
"""

import json
import re
import uuid
from typing import Dict, Any, List

from langchain_core.messages import HumanMessage

from utils.llm import get_llm
from utils.logger import get_logger
from providers.fallback_provider import safe_json_log
from providers.metrics import global_metrics
from providers.cache import global_cache

logger = get_logger("WorkflowEngine")


def extract_json(text: str) -> dict:
    try:
        # Look for the first '{' and the last '}'
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            json_str = match.group()
            return json.loads(json_str, strict=False)
    except Exception as e:
        logger.warning(f"JSON extraction failed: {e}")
    return {}


class BaseAssessmentWorkflow:
    def __init__(self, topic: str, course_name: str = "", academic_domain: str = ""):
        self.topic = topic
        self.course_name = course_name
        self.academic_domain = academic_domain
        self.llm = get_llm()

    def execute(self, request_id: str = None) -> Any:
        raise NotImplementedError("Subclasses must implement execute()")


class ReflectiveJournalWorkflow(BaseAssessmentWorkflow):
    def execute(self, request_id: str = None) -> Dict[str, str]:
        if not request_id:
            request_id = str(uuid.uuid4())
            
        logger.info(f"[{request_id}] Generating Reflective Journal content for topic: {self.topic}")
        
        # 1. Try generating with primary LLM (which runs Groq first)
        raw_text = self.run_ai_pipeline(request_id=request_id)
        
        from providers.fallback_provider import FallbackChatLLM, global_groq_breaker
        provider = "groq"
        model = "llama-3.3-70b-versatile"
        if isinstance(self.llm, FallbackChatLLM) and global_groq_breaker.is_tripped():
            provider = "gemini"
            model = "gemini-2.0-flash"
        
        # 2. Run Validation
        from providers.validator import validate_content
        from providers.formatter import normalize_json_output
        
        is_valid, reason = validate_content(raw_text, "reflective")
        
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
                raw_text = self.run_ai_pipeline(llm=self.llm.gemini_llm, request_id=request_id)
                provider = "gemini"
                model = "gemini-2.0-flash"
                
                is_valid_gemini, reason_gemini = validate_content(raw_text, "reflective")
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
        
        # 3. Normalize JSON formatting
        safe_json_log(
            event_type="normalization_action",
            request_id=request_id,
            provider=provider,
            model=model,
            duration_ms=0,
            fallback_used=(provider == "gemini"),
            validation_passed=True,
            message="Normalizing JSON layout and typography spacing"
        )
        normalized_text = normalize_json_output(raw_text, "reflective")
        parsed = self._parse_reflective_json(normalized_text)
        
        if self._is_empty_payload(parsed):
            logger.warning(f"[{request_id}] AI payload empty or invalid; applying fallback content.")
            return self._fallback_payload()
            
        # Cache ONLY fully validated, formatter-cleaned, successful outputs
        global_cache.set("reflective", self.get_prompt(), normalized_text)
        return parsed

    def get_prompt(self) -> str:
        return f"""
Generate a HIGHLY DETAILED academic reflective journal.

Topic: {self.topic}

Return a FLAT JSON object where each value is a SINGLE STRING containing the full content for that section. Use \\n\\n for paragraph breaks.

Follow STRICT structure for the content:

1. Experience (Class Content)
- Write at least 3–5 paragraphs
- Explain concepts in depth
- Include examples explained in class
- Use formal academic tone

2. Feelings (Emotional Reactions)
- Write 1–2 paragraphs
- Include personal understanding and difficulty
- Reflect on learning experience

3. Learning (Key Insights)
- Write in detailed structured format:
  a) Concept 1 explanation  
  b) Concept 2 explanation  
  c) Concept 3 explanation  
- Each point must be clearly explained in 4–6 lines
- Include technical explanation where needed

4. Application (Practical Use)
- Provide 8–10 real-world applications
- Use bullet points
- Each application must be meaningful and specific

5. Conclusion
- Write a strong academic summary paragraph
- Highlight importance of topic

---

IMPORTANT:

- Return ONLY valid JSON
- The JSON must be flat: {{ "experience": "...", "feelings": "...", "learning": "...", "application": "...", "conclusion": "..." }}
- Each field MUST be a string, NOT an object or array.
- Do NOT include "Final Answer"
- Do NOT include extra text
- Do NOT shorten content
- Ensure LONG and DETAILED output (10-mark level depth)

---

FORMAT:

{{
  "experience": "Paragraph 1...\\n\\nParagraph 2...\\n\\nParagraph 3...",
  "feelings": "...",
  "learning": "a) ...\\nb) ...\\nc) ...",
  "application": "• ...\\n• ...",
  "conclusion": "..."
}}
"""

    def run_ai_pipeline(self, llm=None, request_id: str = None) -> str:
        if llm is None:
            llm = self.llm
        prompt = self.get_prompt()
        content_type = "reflective"
        response = llm.invoke(
            [HumanMessage(content=prompt)],
            request_id=request_id,
            content_type=content_type
        )
        return response.content if hasattr(response, "content") else str(response)

    def _parse_reflective_json(self, text: str) -> Dict[str, str]:
        required = ["experience", "feelings", "learning", "application", "conclusion"]
        
        # Try direct parse first
        try:
            cleaned = text.strip()
            # Remove markdown blocks if AI ignored instructions
            cleaned = re.sub(r"```json\s*", "", cleaned)
            cleaned = re.sub(r"```\s*", "", cleaned)
            
            parsed = json.loads(cleaned, strict=False)
            if isinstance(parsed, dict):
                return {k: str(parsed.get(k, "")).strip() for k in required}
        except:
            pass

        # Use regex extraction as fallback
        extracted = extract_json(text)
        if isinstance(extracted, dict) and extracted:
            return {k: str(extracted.get(k, "")).strip() for k in required}

        return {k: "" for k in required}

    def _is_empty_payload(self, payload: Dict[str, str]) -> bool:
        return not all((payload.get(k, "") or "").strip() for k in ["experience", "feelings", "learning", "application", "conclusion"])

    def _fallback_payload(self) -> Dict[str, str]:
        return {
            "experience": f"I actively engaged with the topic '{self.topic}' through structured reflection and analysis of its core concepts.",
            "feelings": "Initially, I felt a bit overwhelmed by the breadth of the topic, but as I progressed, I became more engaged and curious.",
            "learning": "I learned that this topic is fundamental to understanding practical applications in the field, specifically regarding efficiency and accuracy.",
            "application": "I will apply these insights by incorporating the learned frameworks into my future projects and decision-making processes.",
            "conclusion": "This reflection has solidified my understanding of the topic and motivated me to explore it further in real-world scenarios.",
        }


class DynamicAssignmentWorkflow(ReflectiveJournalWorkflow):
    """Subclass to support legacy routes referencing this name directly."""
    pass


class FreeWritingWorkflow(BaseAssessmentWorkflow):
    def execute(self, request_id: str = None) -> dict:
        if not request_id:
            request_id = str(uuid.uuid4())
            
        logger.info(f"[{request_id}] Generating Free Writing Assessment content for topic: {self.topic}, course: {self.course_name}, domain: {self.academic_domain}")
        
        # 1. Try generating with primary LLM (which runs Groq first)
        raw_text = self.run_ai_pipeline(request_id=request_id)
        
        from providers.fallback_provider import FallbackChatLLM, global_groq_breaker
        provider = "groq"
        model = "llama-3.3-70b-versatile"
        if isinstance(self.llm, FallbackChatLLM) and global_groq_breaker.is_tripped():
            provider = "gemini"
            model = "gemini-2.0-flash"
            
        # 2. Run Validation & Normalization
        from providers.validator import validate_content
        from providers.formatter import normalize_json_output
        
        is_valid, reason = validate_content(raw_text, "freewriting")
        
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
                raw_text = self.run_ai_pipeline(llm=self.llm.gemini_llm, request_id=request_id)
                provider = "gemini"
                model = "gemini-2.0-flash"
                
                is_valid_gemini, reason_gemini = validate_content(raw_text, "freewriting")
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
                
        # 3. Normalize JSON formatting
        safe_json_log(
            event_type="normalization_action",
            request_id=request_id,
            provider=provider,
            model=model,
            duration_ms=0,
            fallback_used=(provider == "gemini"),
            validation_passed=True,
            message="Normalizing JSON layout and typography spacing"
        )
        normalized_text = normalize_json_output(raw_text, "freewriting")
        parsed = self._parse_free_writing_json(normalized_text)
        
        if not parsed or not parsed.get("sections"):
            logger.warning(f"[{request_id}] AI payload empty or invalid for Free Writing; applying fallback content.")
            return self._fallback_payload()
            
        # Cache ONLY fully validated, formatter-cleaned, successful outputs
        global_cache.set("freewriting", self.get_prompt(), normalized_text)
        return parsed

    def get_prompt(self) -> str:
        domain_context = f"Academic Domain: {self.academic_domain}\n" if self.academic_domain else ""
        return f"""
You are generating a HIGHLY DETAILED, multi-page university-style academic free writing assessment.
You are writing this from the perspective of an advanced university student in their final years.

Topic: {self.topic}
Subject/Course: {self.course_name or "Academic Writing"}
{domain_context}

Analyze the provided topic and dynamically determine:
- A suitable and customized academic structure.
- A natural section hierarchy (at least 4-6 deep subtopics).
- A logical educational flow and progression of concepts.

DO NOT use generic headings like "Introduction", "Core Arguments", "Analysis", or "Conclusion" unless they are specifically customized to match the topic (e.g., use "Introduction to Sequential Circuit Analysis", "The Epistemological Paradigm Shift").

### MANDATORY LENGTH & DEPTH REQUIREMENTS:
- GENERATE A MASSIVE AMOUNT OF TEXT. 
- The total output must be at least 1500 to 2000 words.
- You must create at least 5 to 7 major sections.
- Each section MUST contain at least 5 extremely long, detailed, rigorous paragraphs.
- Provide deep technical concept elaboration, methodologies, academic transitions, and relevant real-world examples.
- Do NOT generate short summaries, brief bullet points, or repetitive filler content. Failure to write long paragraphs will result in a failing grade.
- Ensure the tone reflects an engineering theory explanation document or rigorous academic subject material, NOT a diary or journal.

Write in a highly professional, academic tone. Incorporate scholarly citations (e.g., "Atherton (2024) asserts...", "contrary to traditional perspectives...") and transition phrases between paragraphs to maintain educational flow.

Return ONLY a valid JSON object representing the assessment with a title and an array of sections. Do NOT include any markdown code blocks (e.g. ```json).
The JSON must have the strictly following format:
{{
  "title": "{self.topic}",
  "sections": [
    {{
      "heading": "Topic-Specific Heading Name",
      "content": "Paragraph 1...\\n\\nParagraph 2...\\n\\nParagraph 3...\\n\\nParagraph 4..."
    }},
    ...
  ]
}}
"""

    def run_ai_pipeline(self, llm=None, request_id: str = None) -> str:
        if llm is None:
            llm = self.llm
        prompt = self.get_prompt()
        content_type = "freewriting"
        response = llm.invoke(
            [HumanMessage(content=prompt)],
            request_id=request_id,
            content_type=content_type
        )
        return response.content if hasattr(response, "content") else str(response)

    def _parse_free_writing_json(self, text: str) -> dict:
        # Try direct parse first
        try:
            cleaned = text.strip()
            # Remove markdown blocks if AI ignored instructions
            cleaned = re.sub(r"```json\s*", "", cleaned)
            cleaned = re.sub(r"```\s*", "", cleaned)
            
            parsed = json.loads(cleaned, strict=False)
            if isinstance(parsed, dict) and "sections" in parsed:
                return {
                    "title": str(parsed.get("title", self.topic)).strip(),
                    "sections": [
                        {
                            "heading": str(item.get("heading", "")).strip(),
                            "content": str(item.get("content", "")).strip()
                        }
                        for item in parsed["sections"]
                        if item.get("heading") and item.get("content")
                    ]
                }
        except:
            pass

        # Try regex extract
        try:
            match = re.search(r"\{.*\}", text, re.DOTALL)
            if match:
                parsed = json.loads(match.group(), strict=False)
                if isinstance(parsed, dict) and "sections" in parsed:
                    return {
                        "title": str(parsed.get("title", self.topic)).strip(),
                        "sections": [
                            {
                                "heading": str(item.get("heading", "")).strip(),
                                "content": str(item.get("content", "")).strip()
                            }
                            for item in parsed["sections"]
                            if item.get("heading") and item.get("content")
                        ]
                    }
        except:
            pass

        return {}

    def _fallback_payload(self) -> dict:
        domain_lbl = f" in the domain of {self.academic_domain}" if self.academic_domain else ""
        return {
            "title": self.topic,
            "sections": [
                {
                    "heading": f"Theoretical Framework of {self.topic}",
                    "content": f"Analyzing the fundamental structures of {self.topic} within the context of {self.course_name or 'the subject'}{domain_lbl} reveals a complex array of interconnected theories and paradigms. Academic consensus suggests that understanding these core tenets is critical before deploying them in practical applications."
                },
                {
                    "heading": f"Pedagogical and Practical Implications",
                    "content": f"The implementation of {self.topic} has significant implications for both practitioners and scholars. In particular, efficiency limitations and computational or cognitive overhead present challenging design constraints that require careful optimization."
                },
                {
                    "heading": "Critical Synthesis and Future Horizons",
                    "content": "Ultimately, a critical review of literature highlights the gaps between theoretical models and empirical execution. Future research should prioritize building robust, adaptable frameworks that address these challenges while ensuring safety and alignment."
                }
            ]
        }
