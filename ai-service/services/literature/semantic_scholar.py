import os
import time
import httpx
from typing import List, Dict, Any
from utils.logger import get_logger

logger = get_logger("SemanticScholarProvider")

class SemanticScholarProvider:
    def __init__(self):
        self.api_url = "https://api.semanticscholar.org/graph/v1/paper/search"
        self.timeout = 10.0

    def search(self, query: str) -> List[Dict[str, Any]]:
        api_key = os.getenv("SEMANTIC_SCHOLAR_API_KEY")
        headers = {}
        if api_key and api_key.strip():
            headers["x-api-key"] = api_key.strip()
            logger.info("Using SEMANTIC_SCHOLAR_API_KEY for search")
        else:
            logger.info("Using unauthenticated public Semantic Scholar requests")

        params = {
            "query": query,
            "limit": 30,
            "fields": "title,abstract,authors,year,venue,citationCount,externalIds,url"
        }

        # 1 retry attempt
        for attempt in range(1, 3):
            try:
                logger.info(f"Querying Semantic Scholar (attempt {attempt}): q={query}")
                with httpx.Client(timeout=self.timeout) as client:
                    response = client.get(self.api_url, params=params, headers=headers)
                    if response.status_code == 429:
                        logger.warning("Semantic Scholar rate limit (429) hit.")
                        if attempt == 1:
                            time.sleep(2)
                            continue
                        return []
                    response.raise_for_status()
                    data = response.json()
                    raw_papers = data.get("data", [])
                    
                    cleaned_raw = []
                    for raw in raw_papers:
                        paper_id = raw.get("paperId", "")
                        ext_ids = raw.get("externalIds", {})
                        doi = ext_ids.get("DOI", "")
                        url = raw.get("url") or (f"https://www.semanticscholar.org/paper/{paper_id}" if paper_id else "")
                        
                        cleaned_raw.append({
                            "id": paper_id,
                            "title": raw.get("title", ""),
                            "abstract": raw.get("abstract", ""),
                            "authors": raw.get("authors", []),
                            "year": raw.get("year"),
                            "venue": raw.get("venue", ""),
                            "citationCount": raw.get("citationCount", 0),
                            "doi": doi,
                            "url": url
                        })
                    logger.info(f"Semantic Scholar returned {len(cleaned_raw)} raw results.")
                    return cleaned_raw
            except Exception as e:
                logger.warning(f"Semantic Scholar attempt {attempt} failed: {e}")
                if attempt == 1:
                    time.sleep(1)
                    continue
        return []
