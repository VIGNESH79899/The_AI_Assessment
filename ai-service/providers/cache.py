import os
import time
import hashlib
import threading
from typing import Dict, Tuple, Optional
from utils.logger import get_logger

logger = get_logger("ResponseCache")

class ResponseCache:
    """
    Thread-safe, in-memory Cache with Size Limits and TTL.
    Designed to be optional, isolated, and strictly non-blocking.
    """
    def __init__(self, ttl_seconds: int = 3600, max_entries: int = 1000):
        self.ttl = ttl_seconds
        self.max_entries = max_entries
        self.cache: Dict[str, Tuple[str, float]] = {}  # key -> (response_text, timestamp)
        self.lock = threading.Lock()

    def _generate_key(self, content_type: str, prompt: str) -> str:
        """
        Generate a deterministic cache key based on prompt and type.
        """
        raw_key = f"{content_type}:{prompt.strip()}"
        return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

    def get(self, content_type: str, prompt: str) -> Optional[str]:
        try:
            if os.getenv("CACHE_ENABLED", "true").lower() != "true":
                return None

            key = self._generate_key(content_type, prompt)
            now = time.time()
            
            with self.lock:
                if key in self.cache:
                    val, ts = self.cache[key]
                    if now - ts < self.ttl:
                        return val
                    else:
                        del self.cache[key]
        except Exception as e:
            logger.warning(f"Cache get operation failed (non-blocking bypass): {e}")
        return None

    def set(self, content_type: str, prompt: str, response: str):
        try:
            if os.getenv("CACHE_ENABLED", "true").lower() != "true":
                return

            key = self._generate_key(content_type, prompt)
            now = time.time()

            with self.lock:
                # Eager TTL eviction: clean up all expired entries to prevent memory leaks
                expired_keys = [k for k, v in self.cache.items() if now - v[1] >= self.ttl]
                for k in expired_keys:
                    del self.cache[k]

                if len(self.cache) >= self.max_entries:
                    # Evict oldest entry based on timestamp
                    oldest_key = min(self.cache.keys(), key=lambda k: self.cache[k][1])
                    del self.cache[oldest_key]
                    
                self.cache[key] = (response, now)
        except Exception as e:
            logger.warning(f"Cache set operation failed (non-blocking bypass): {e}")

    def clear(self):
        try:
            with self.lock:
                self.cache.clear()
        except Exception as e:
            logger.warning(f"Cache clear operation failed: {e}")

global_cache = ResponseCache()

