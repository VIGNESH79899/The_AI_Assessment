import time
import threading
from typing import Dict, Any

class ProviderMetrics:
    """
    Thread-safe collector for provider health, latency, success rates, and uptime.
    """
    def __init__(self):
        self.lock = threading.Lock()
        self.startup_time = time.time()
        
        self.total_requests = 0
        self.groq_requests = 0
        self.groq_success = 0
        self.groq_failures = 0
        self.groq_timeouts = 0
        self.groq_validation_failures = 0
        
        self.gemini_requests = 0
        self.gemini_success = 0
        self.gemini_failures = 0
        self.gemini_timeouts = 0
        self.gemini_validation_failures = 0
        
        self.fallback_count = 0
        self.cache_hits = 0
        
        self.total_groq_latency_ms = 0
        self.total_gemini_latency_ms = 0

    def record_request(self, provider: str):
        with self.lock:
            self.total_requests += 1
            if provider == "groq":
                self.groq_requests += 1
            elif provider == "gemini":
                self.gemini_requests += 1

    def record_success(self, provider: str, latency_ms: int):
        with self.lock:
            if provider == "groq":
                self.groq_success += 1
                self.total_groq_latency_ms += latency_ms
            elif provider == "gemini":
                self.gemini_success += 1
                self.total_gemini_latency_ms += latency_ms

    def record_failure(self, provider: str, is_timeout: bool = False):
        with self.lock:
            if provider == "groq":
                self.groq_failures += 1
                if is_timeout:
                    self.groq_timeouts += 1
            elif provider == "gemini":
                self.gemini_failures += 1
                if is_timeout:
                    self.gemini_timeouts += 1

    def record_validation_failure(self, provider: str):
        with self.lock:
            if provider == "groq":
                self.groq_validation_failures += 1
            elif provider == "gemini":
                self.gemini_validation_failures += 1

    def record_fallback(self):
        with self.lock:
            self.fallback_count += 1

    def record_cache_hit(self):
        with self.lock:
            self.total_requests += 1
            self.cache_hits += 1

    def get_stats(self) -> Dict[str, Any]:
        with self.lock:
            uptime = time.time() - self.startup_time
            avg_groq_latency = (self.total_groq_latency_ms / self.groq_success) if self.groq_success > 0 else 0
            avg_gemini_latency = (self.total_gemini_latency_ms / self.gemini_success) if self.gemini_success > 0 else 0
            
            groq_success_rate = (self.groq_success / self.groq_requests * 100) if self.groq_requests > 0 else 100.0
            gemini_success_rate = (self.gemini_success / self.gemini_requests * 100) if self.gemini_requests > 0 else 100.0
            
            return {
                "uptime_seconds": int(uptime),
                "total_requests": self.total_requests,
                "fallback_count": self.fallback_count,
                "cache_hits": self.cache_hits,
                "groq": {
                    "requests": self.groq_requests,
                    "success": self.groq_success,
                    "failures": self.groq_failures,
                    "timeouts": self.groq_timeouts,
                    "validation_failures": self.groq_validation_failures,
                    "success_rate_percent": round(groq_success_rate, 2),
                    "avg_latency_ms": round(avg_groq_latency, 2)
                },
                "gemini": {
                    "requests": self.gemini_requests,
                    "success": self.gemini_success,
                    "failures": self.gemini_failures,
                    "timeouts": self.gemini_timeouts,
                    "validation_failures": self.gemini_validation_failures,
                    "success_rate_percent": round(gemini_success_rate, 2),
                    "avg_latency_ms": round(avg_gemini_latency, 2)
                }
            }

global_metrics = ProviderMetrics()
