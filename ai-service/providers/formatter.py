import json
import re

def sanitize_json_string(text: str) -> str:
    """
    Extracts the raw JSON object from LLM response.
    Removes markdown formatting and any preceding/succeeding text content.
    """
    cleaned = text.strip()
    cleaned = re.sub(r"```json\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"```\s*", "", cleaned)
    
    first_brace = cleaned.find("{")
    last_brace = cleaned.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        cleaned = cleaned[first_brace:last_brace + 1]
    return cleaned

def normalize_spacing_and_typography(content: str) -> str:
    """
    Cleans up whitespace, duplicate carriage returns, lists, and markdown bold/italics
    non-destructively without altering text content.
    """
    if not content:
        return ""
    
    cleaned = content.replace("\r\n", "\n").replace("\r", "\n")
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    cleaned = re.sub(r"[ \t]{2,}", " ", cleaned)
    cleaned = re.sub(r"^[ \t]*[-*+][ \t]+", "• ", cleaned, flags=re.MULTILINE)
    
    cleaned = re.sub(r"\*\*\*(.*?)\*\*\*", r"\1", cleaned)
    cleaned = re.sub(r"\*\*(.*?)\*\*", r"\1", cleaned)
    cleaned = re.sub(r"\*(.*?)\*", r"\1", cleaned)
    cleaned = re.sub(r"__(.*?)__", r"\1", cleaned)
    cleaned = re.sub(r"_(.*?)_", r"\1", cleaned)
    
    return cleaned.strip()

def normalize_json_output(text: str, content_type: str = "reflective") -> str:
    """
    Normalizes a JSON response, processing fields non-destructively.
    """
    sanitized = sanitize_json_string(text)
    try:
        data = json.loads(sanitized)
        if content_type == "reflective":
            required = ["experience", "feelings", "learning", "application", "conclusion"]
            for key in required:
                if key in data and isinstance(data[key], str):
                    data[key] = normalize_spacing_and_typography(data[key])
        elif content_type == "freewriting":
            if "title" in data and isinstance(data["title"], str):
                data["title"] = normalize_spacing_and_typography(data["title"])
            if "sections" in data and isinstance(data["sections"], list):
                for sec in data["sections"]:
                    if isinstance(sec, dict):
                        if "heading" in sec and isinstance(sec["heading"], str):
                            sec["heading"] = normalize_spacing_and_typography(sec["heading"])
                        if "content" in sec and isinstance(sec["content"], str):
                            sec["content"] = normalize_spacing_and_typography(sec["content"])
        
        return json.dumps(data, indent=2, ensure_ascii=False)
    except Exception:
        return text
