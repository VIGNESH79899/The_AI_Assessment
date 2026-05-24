import httpx
from typing import List, Optional
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage, AIMessage, HumanMessage, SystemMessage
from langchain_core.outputs import ChatResult, ChatGeneration
from utils.logger import get_logger

logger = get_logger("GeminiProvider")

class GeminiChatLLM(BaseChatModel):
    """LangChain-compatible wrapper for Gemini API using direct HTTPX requests."""

    model_name: str = "gemini-2.0-flash"
    temperature: float = 0.7
    top_p: float = 0.9
    timeout: float = 15.0
    api_key: str = ""

    class Config:
        arbitrary_types_allowed = True

    def __init__(self, api_key: str, model: str = "gemini-2.0-flash", temperature: float = 0.7, top_p: float = 0.9, timeout: float = 15.0, **kwargs):
        super().__init__(**kwargs)
        self.api_key = api_key
        self.model_name = model
        self.temperature = temperature
        self.top_p = top_p
        self.timeout = timeout

    def _generate(self, messages: List[BaseMessage], stop: Optional[List[str]] = None, **kwargs) -> ChatResult:
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not configured")

        request_id = kwargs.get("request_id") or "unknown"
        contents = []
        system_instruction = None

        for msg in messages:
            if isinstance(msg, SystemMessage):
                system_instruction = {
                    "parts": [{"text": msg.content}]
                }
            elif isinstance(msg, HumanMessage):
                contents.append({
                    "role": "user",
                    "parts": [{"text": msg.content}]
                })
            elif isinstance(msg, AIMessage):
                contents.append({
                    "role": "model",
                    "parts": [{"text": msg.content}]
                })
            else:
                contents.append({
                    "role": "user",
                    "parts": [{"text": msg.content}]
                })

        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": self.temperature,
                "topP": self.top_p,
            }
        }
        if system_instruction:
            payload["systemInstruction"] = system_instruction

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"
        
        headers = {
            "Content-Type": "application/json"
        }

        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                response_json = response.json()
        except Exception as e:
            is_timeout = "timeout" in str(e).lower() or "timed out" in str(e).lower()
            logger.error(f"[AI] [{request_id}] Gemini API call failed (timeout={is_timeout}): {e}")
            raise e

        # Safe extraction logic with null checks
        candidates = response_json.get("candidates")
        if not isinstance(candidates, list) or len(candidates) == 0:
            raise ValueError("Gemini API response contains no candidates")

        content_obj = candidates[0].get("content")
        if not isinstance(content_obj, dict):
            raise ValueError("Gemini API candidate contains no content object")

        parts = content_obj.get("parts")
        if not isinstance(parts, list) or len(parts) == 0:
            raise ValueError("Gemini API content contains no parts list")

        text = parts[0].get("text")
        if text is None:
            raise ValueError("Gemini API part contains no text content")

        return ChatResult(generations=[ChatGeneration(message=AIMessage(content=text))])

    @property
    def _llm_type(self) -> str:
        return "gemini-chat"
