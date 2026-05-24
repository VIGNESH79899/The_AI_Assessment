import os
import time
import json
import uuid
import threading
from typing import List, Optional, Any, ClassVar
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage, AIMessage
from langchain_core.outputs import ChatResult, ChatGeneration
from utils.logger import get_logger

from providers.groq_provider import GroqChatLLM
from providers.gemini_provider import GeminiChatLLM
from providers.metrics import global_metrics
from providers.cache import global_cache

logger = get_logger("FallbackProvider")

def safe_json_log(event_type: str, request_id: str, provider: str, model: str, duration_ms: int, fallback_used: bool, validation_passed: bool, message: str = ""):
    try:
        log_data = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "event_type": event_type,
            "request_id": request_id,
            "provider": provider,
            "model": model,
            "duration_ms": duration_ms,
            "fallback_used": fallback_used,
            "validation_passed": validation_passed,
            "message": message
        }
        print(json.dumps(log_data), flush=True)
    except Exception as e:
        logger.error(f"Structured JSON logging failed: {e}")

class CircuitBreaker:
    """
    Thread-safe circuit breaker state manager.
    Encapsulated to avoid Pydantic copying issues and unsafe globals.
    """
    def __init__(self, limit: int = 5, window_seconds: float = 120.0, cooldown_seconds: float = 300.0):
        self.limit = limit
        self.window = window_seconds
        self.cooldown = cooldown_seconds
        self.failures = []
        self.lock = threading.Lock()

    def record_failure(self):
        with self.lock:
            self.failures.append(time.time())

    def is_tripped(self) -> bool:
        now = time.time()
        with self.lock:
            max_needed = self.window + self.cooldown
            self.failures = [t for t in self.failures if now - t < max_needed]
            window_failures = [t for t in self.failures if now - t < self.window]
            if len(window_failures) >= self.limit:
                sorted_failures = sorted(window_failures, reverse=True)
                fifth_recent_failure = sorted_failures[self.limit - 1]
                if now - fifth_recent_failure < self.cooldown:
                    return True
        return False

    def clear(self):
        with self.lock:
            self.failures.clear()

global_groq_breaker = CircuitBreaker()

class FallbackChatLLM(BaseChatModel):
    """
    Fallback Chat Model wrapper that prioritizes Groq with failover to Gemini.
    Features:
    - Thread-safe Circuit Breaker via global_groq_breaker.
    - Structured JSON server logging.
    - Automatic error fallback and recovery.
    - Latency and success tracking.
    """

    groq_llm: Any = None
    gemini_llm: Any = None

    class Config:
        arbitrary_types_allowed = True

    def __init__(self, groq_llm: GroqChatLLM, gemini_llm: GeminiChatLLM, **kwargs):
        super().__init__(groq_llm=groq_llm, gemini_llm=gemini_llm, **kwargs)

    def _generate(self, messages: List[BaseMessage], stop: Optional[List[str]] = None, **kwargs) -> ChatResult:
        # Prevent keyword collision on downstream expansion
        kwargs_clean = kwargs.copy()
        request_id = kwargs_clean.pop("request_id", None) or str(uuid.uuid4())
        content_type = kwargs_clean.pop("content_type", None) or "reflective"
        
        prompt_text = "\n".join([msg.content for msg in messages])
        cached_res = global_cache.get(content_type, prompt_text)
        if cached_res:
            global_metrics.record_cache_hit()
            safe_json_log(
                event_type="cache_hit",
                request_id=request_id,
                provider="cache",
                model=self.groq_llm.model_name,
                duration_ms=0,
                fallback_used=False,
                validation_passed=True,
                message="Cache hit retrieved successfully"
            )
            return ChatResult(generations=[ChatGeneration(message=AIMessage(content=cached_res))])

        is_circuit_tripped = global_groq_breaker.is_tripped()
        
        if not is_circuit_tripped:
            global_metrics.record_request("groq")
            safe_json_log(
                event_type="provider_start",
                request_id=request_id,
                provider="groq",
                model=self.groq_llm.model_name,
                duration_ms=0,
                fallback_used=False,
                validation_passed=False,
                message="Trying GROQ primary provider"
            )
            start_time = time.time()
            try:
                result = self.groq_llm._generate(messages, stop, request_id=request_id, **kwargs_clean)
                duration_ms = int((time.time() - start_time) * 1000)
                
                global_metrics.record_success("groq", duration_ms)
                safe_json_log(
                    event_type="provider_success",
                    request_id=request_id,
                    provider="groq",
                    model=self.groq_llm.model_name,
                    duration_ms=duration_ms,
                    fallback_used=False,
                    validation_passed=False,
                    message="GROQ completion successful"
                )
                return result
            except Exception as e:
                duration_ms = int((time.time() - start_time) * 1000)
                is_timeout = "timeout" in str(e).lower() or "timed out" in str(e).lower()
                global_metrics.record_failure("groq", is_timeout=is_timeout)
                global_groq_breaker.record_failure()
                
                safe_json_log(
                    event_type="provider_failure",
                    request_id=request_id,
                    provider="groq",
                    model=self.groq_llm.model_name,
                    duration_ms=duration_ms,
                    fallback_used=True,
                    validation_passed=False,
                    message=f"GROQ failed (timeout={is_timeout}): {e}"
                )
        else:
            safe_json_log(
                event_type="circuit_breaker_tripped",
                request_id=request_id,
                provider="groq",
                model=self.groq_llm.model_name,
                duration_ms=0,
                fallback_used=True,
                validation_passed=False,
                message="GROQ circuit breaker tripped, bypassing directly to Gemini"
            )

        global_metrics.record_request("gemini")
        global_metrics.record_fallback()
        
        safe_json_log(
            event_type="provider_start",
            request_id=request_id,
            provider="gemini",
            model=self.gemini_llm.model_name,
            duration_ms=0,
            fallback_used=True,
            validation_passed=False,
            message="Trying Gemini fallback provider"
        )
        start_time = time.time()
        try:
            result = self.gemini_llm._generate(messages, stop, request_id=request_id, **kwargs_clean)
            duration_ms = int((time.time() - start_time) * 1000)
            
            global_metrics.record_success("gemini", duration_ms)
            safe_json_log(
                event_type="provider_success",
                request_id=request_id,
                provider="gemini",
                model=self.gemini_llm.model_name,
                duration_ms=duration_ms,
                fallback_used=True,
                validation_passed=False,
                message="Gemini fallback generation successful"
            )
            return result
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            is_timeout = "timeout" in str(e).lower() or "timed out" in str(e).lower()
            global_metrics.record_failure("gemini", is_timeout=is_timeout)
            
            safe_json_log(
                event_type="provider_exhausted",
                request_id=request_id,
                provider="gemini",
                model=self.gemini_llm.model_name,
                duration_ms=duration_ms,
                fallback_used=True,
                validation_passed=False,
                message=f"Gemini fallback failed (timeout={is_timeout}): {e}"
            )
            raise RuntimeError(f"AI Generation failed: both providers exhausted. Gemini error: {e}")

    @property
    def _llm_type(self) -> str:
        return "fallback-chat"


def get_llm(model: str = "llama-3.3-70b-versatile", temperature: float = 0.7) -> FallbackChatLLM:
    """
    Exposes a FallbackChatLLM instance pre-configured with Groq and Gemini.
    """
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        logger.critical("GROQ_API_KEY is missing from environment.")
        raise EnvironmentError("GROQ_API_KEY not found. Set it in your .env file.")

    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        logger.warning("GEMINI_API_KEY is missing from environment. Fallback will fail if GROQ goes down.")

    groq_llm = GroqChatLLM(api_key=groq_api_key, model=model, temperature=temperature)
    gemini_llm = GeminiChatLLM(api_key=gemini_api_key or "", model="gemini-2.0-flash", temperature=temperature)

    fallback_llm = FallbackChatLLM(groq_llm=groq_llm, gemini_llm=gemini_llm)
    logger.info(f"Fallback LLM wrapper initialized: primary={model}, fallback=gemini-2.0-flash")
    return fallback_llm
