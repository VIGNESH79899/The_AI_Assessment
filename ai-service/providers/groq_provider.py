import os
from typing import Any, List, Optional
from groq import Groq
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage, AIMessage, HumanMessage, SystemMessage
from langchain_core.outputs import ChatResult, ChatGeneration
from utils.logger import get_logger

logger = get_logger("GroqProvider")

class GroqChatLLM(BaseChatModel):
    """Minimal LangChain-compatible wrapper around the raw Groq SDK with retry and timeout protection."""

    client: Any = None
    model_name: str = "llama-3.3-70b-versatile"
    temperature: float = 0.7
    timeout: float = 10.0

    class Config:
        arbitrary_types_allowed = True

    def __init__(self, api_key: str, model: str = "llama-3.3-70b-versatile", temperature: float = 0.7, timeout: float = 10.0, **kwargs):
        super().__init__(**kwargs)
        self.model_name = model
        self.temperature = temperature
        self.timeout = timeout
        self.client = Groq(api_key=api_key, timeout=self.timeout)

    def _convert_messages(self, messages: List[BaseMessage]) -> list:
        """Convert LangChain message objects to Groq-compatible dicts."""
        result = []
        for msg in messages:
            if isinstance(msg, SystemMessage):
                result.append({"role": "system", "content": msg.content})
            elif isinstance(msg, HumanMessage):
                result.append({"role": "user", "content": msg.content})
            elif isinstance(msg, AIMessage):
                result.append({"role": "assistant", "content": msg.content})
            else:
                result.append({"role": "user", "content": msg.content})
        return result

    def _generate(self, messages: List[BaseMessage], stop: Optional[List[str]] = None, **kwargs) -> ChatResult:
        """Core generation method with timeout and 1 automatic retry."""
        groq_messages = self._convert_messages(messages)
        request_id = kwargs.get("request_id") or "unknown"
        
        last_error = None
        for attempt in range(1, 3):
            try:
                if attempt > 1:
                    logger.warning(f"[AI] [{request_id}] GROQ retry attempt")
                
                response = self.client.chat.completions.create(
                    model=self.model_name,
                    messages=groq_messages,
                    temperature=self.temperature,
                    stop=stop
                )
                
                content = response.choices[0].message.content
                return ChatResult(generations=[ChatGeneration(message=AIMessage(content=content))])
                
            except Exception as e:
                last_error = e
                # Check for timeouts in exception message or type
                is_timeout = "timeout" in str(e).lower() or "timed out" in str(e).lower()
                logger.warning(f"[AI] [{request_id}] Groq API call attempt {attempt} failed (timeout={is_timeout}): {e}")
                
        raise last_error

    @property
    def _llm_type(self) -> str:
        return "groq-chat"
