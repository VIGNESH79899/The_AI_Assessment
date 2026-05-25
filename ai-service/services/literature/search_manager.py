import time
import json
import threading
from typing import List, Dict, Any, Tuple
from services.literature.semantic_scholar import SemanticScholarProvider
from services.literature.arxiv_provider import ArxivProvider
from services.literature.normalizer import validate_and_normalize_paper, deduplicate_papers
from services.literature.models import Paper
from utils.logger import get_logger

logger = get_logger("SearchManager")

class SearchManager:
    def __init__(self):
        self.ss_provider = SemanticScholarProvider()
        self.arxiv_provider = ArxivProvider()
        # In-memory search cache: query -> (papers, timestamp)
        self.cache: Dict[str, Tuple[List[Paper], float]] = {}
        self.cache_ttl = 600.0  # 10 minutes cache
        self.lock = threading.Lock()

    def search(self, query: str) -> List[Paper]:
        query = query.strip()
        if not query:
            return []

        now = time.time()
        
        # Cache check (thread-safe)
        with self.lock:
            if query in self.cache:
                cached_papers, ts = self.cache[query]
                if now - ts < self.cache_ttl:
                    logger.info(f"Search cache HIT for query: '{query}'")
                    # Format log for Cache Hit
                    log_data = {
                        "query": query,
                        "provider": "cache",
                        "fallback_used": False,
                        "results": len(cached_papers),
                        "duration_ms": 0,
                        "cache_hit": True
                    }
                    print(json.dumps(log_data), flush=True)
                    return cached_papers

        start_time = time.time()
        provider_used = "semantic_scholar"
        fallback_used = False
        raw_papers = []

        try:
            # 1. Try Semantic Scholar
            raw_papers = self.ss_provider.search(query)
        except Exception as e:
            logger.warning(f"Semantic Scholar query exception: {e}")

        # Fallback to arXiv if SS returns insufficient results (< 5) or fails
        if len(raw_papers) < 5:
            fallback_used = True
            provider_used = "arxiv"
            try:
                arxiv_papers = self.arxiv_provider.search(query)
                # Combine results, putting Semantic Scholar results first
                raw_papers = raw_papers + arxiv_papers
            except Exception as e:
                logger.error(f"ArXiv query exception: {e}")

        # 2. Normalize and validate papers
        normalized_papers = []
        for raw in raw_papers:
            source = "arxiv" if raw.get("venue") == "ArXiv" else "semantic_scholar"
            paper = validate_and_normalize_paper(raw, source)
            if paper:
                normalized_papers.append(paper)

        # 3. Deduplicate papers
        deduplicated = deduplicate_papers(normalized_papers)

        # 4. Limit to top 15 results
        final_papers = deduplicated[:15]
        duration_ms = int((time.time() - start_time) * 1000)

        # Log search fallback event
        log_data = {
            "query": query,
            "provider": provider_used,
            "fallback_used": fallback_used,
            "results": len(final_papers),
            "duration_ms": duration_ms,
            "cache_hit": False
        }
        print(json.dumps(log_data), flush=True)

        # Cache successful search results (non-empty, thread-safe)
        if final_papers:
            with self.lock:
                self.cache[query] = (final_papers, now)

        return final_papers

global_search_manager = SearchManager()
