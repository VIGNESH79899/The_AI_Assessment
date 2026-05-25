import json
import re
from typing import Tuple

def has_excessive_repetition(text: str) -> bool:
    """
    Detects if a phrase of 3 words is repeated consecutively 4+ times,
    which indicates an infinite loop/repetition bug in LLM generation.
    """
    words = text.lower().split()
    if len(words) < 20:
        return False
    
    for i in range(len(words) - 15):
        phrase = tuple(words[i:i+3])
        count = 0
        for j in range(i + 3, len(words) - 2, 3):
            next_phrase = tuple(words[j:j+3])
            if phrase == next_phrase:
                count += 1
                if count >= 4:
                    return True
            else:
                break
    return False

def validate_content(text: str, content_type: str = "reflective") -> Tuple[bool, str]:
    """
    Performs multi-layered validation on the LLM output:
    1. Existence & emptiness
    2. Minimum length (at least 150 words)
    3. Canned AI refusals
    4. Repetition detection
    5. Malformed JSON & schema integrity
    """
    if not text or not text.strip():
        return False, "Content is empty"

    words = text.strip().split()
    if len(words) < 150:
        return False, f"Content word count is too low ({len(words)} words, minimum 150 required)"

    lower_text = text.lower()
    refusal_patterns = [
        "as an ai",
        "i cannot fulfill",
        "i cannot generate",
        "i am unable to",
        "sorry, but i can't",
        "against my safety guidelines",
        "inappropriate content"
    ]
    for pattern in refusal_patterns:
        if pattern in lower_text:
            return False, f"AI refusal signature detected: '{pattern}'"

    if has_excessive_repetition(lower_text):
        return False, "Excessive text repetition detected (potential LLM infinite loop)"

    cleaned = text.strip()
    cleaned = re.sub(r"```json\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"```\s*", "", cleaned)
    
    first_brace = cleaned.find("{")
    last_brace = cleaned.rfind("}")
    if first_brace == -1 or last_brace == -1 or last_brace <= first_brace:
        return False, "No valid JSON braces found in output"
    
    json_str = cleaned[first_brace:last_brace + 1]
    
    try:
        data = json.loads(json_str, strict=False)
    except json.JSONDecodeError as e:
        return False, f"JSON parse error: {e}"

    if not isinstance(data, dict):
        return False, "JSON root is not an object/dictionary"

    if content_type == "reflective":
        required = ["experience", "feelings", "learning", "application", "conclusion"]
        for key in required:
            val = data.get(key)
            if not val or not str(val).strip():
                return False, f"Missing or empty required field for reflective journal: '{key}'"
            if not isinstance(val, str):
                return False, f"Required field '{key}' must be a string"
    elif content_type == "freewriting":
        title = data.get("title")
        if not title or not str(title).strip():
            return False, "Missing or empty required field for free writing: 'title'"
        
        sections = data.get("sections")
        if not isinstance(sections, list) or len(sections) == 0:
            return False, "Missing, empty, or invalid 'sections' list for free writing"
        
        for idx, sec in enumerate(sections):
            if not isinstance(sec, dict):
                return False, f"Free writing section at index {idx} is not a dictionary"
            heading = sec.get("heading")
            content = sec.get("content")
            if not heading or not str(heading).strip():
                return False, f"Free writing section at index {idx} is missing a heading"
            if not content or not str(content).strip():
                return False, f"Free writing section at index {idx} is missing content"
            if not isinstance(heading, str) or not isinstance(content, str):
                return False, f"Free writing section at index {idx} fields are not strings"
    elif content_type == "literature_survey":
        required = ["introduction", "objectives", "conclusion"]
        for key in required:
            val = data.get(key)
            if not val or not str(val).strip():
                return False, f"Missing or empty required field for literature survey: '{key}'"
            if not isinstance(val, str):
                return False, f"Required field '{key}' must be a string"
    else:
        return False, f"Unknown content type: {content_type}"

    return True, ""
