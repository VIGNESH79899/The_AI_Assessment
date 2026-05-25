import re
from typing import List, Optional
from services.literature.models import Paper

def normalize_title(title: str) -> str:
    """Helper to lowercase and strip non-alphanumeric characters from title."""
    return re.sub(r'[^a-z0-9]', '', title.lower().strip())

def jaccard_similarity(str1: str, str2: str) -> float:
    """Calculates Jaccard similarity of two strings based on words."""
    words1 = set(re.findall(r'\w+', str1.lower()))
    words2 = set(re.findall(r'\w+', str2.lower()))
    if not words1 or not words2:
        return 0.0
    return len(words1.intersection(words2)) / len(words1.union(words2))

def validate_and_normalize_paper(raw_data: dict, source: str) -> Optional[Paper]:
    """
    Validates and normalizes paper raw metadata into the stable Paper schema.
    Returns Paper object or None if invalid/malformed.
    """
    try:
        title = raw_data.get("title", "").strip()
        if not title:
            return None
        
        abstract = raw_data.get("abstract", "").strip()
        # Clean abstract whitespace
        abstract = re.sub(r'\s+', ' ', abstract)
        if len(abstract) < 20:  # minimum length requirement
            return None
        
        # Max abstract length trimming (1500 chars)
        if len(abstract) > 1500:
            abstract = abstract[:1497] + "..."
            
        authors = raw_data.get("authors")
        if not isinstance(authors, list):
            authors = []
            
        # Ensure list of strings
        cleaned_authors = []
        for a in authors:
            if isinstance(a, str):
                cleaned_authors.append(a.strip())
            elif isinstance(a, dict) and "name" in a:
                cleaned_authors.append(str(a["name"]).strip())
        authors = [a for a in cleaned_authors if a]
        if not authors:
            authors = ["Unknown Author"]
            
        # Year validation
        try:
            year = int(raw_data.get("year") or 2025)
            if year < 1800 or year > 2100:
                year = 2025
        except:
            year = 2025
            
        venue = raw_data.get("venue") or ""
        venue = venue.strip() if isinstance(venue, str) else ""
        if not venue:
            venue = "ArXiv" if source == "arxiv" else "Research Venue"
            
        try:
            citation_count = int(raw_data.get("citationCount") or 0)
            if citation_count < 0:
                citation_count = 0
        except:
            citation_count = 0
            
        doi = raw_data.get("doi") or ""
        if not doi and isinstance(raw_data.get("externalIds"), dict):
            doi = raw_data.get("externalIds", {}).get("DOI") or ""
        doi = doi.strip() if isinstance(doi, str) else ""
        
        url = raw_data.get("url") or ""
        url = url.strip() if isinstance(url, str) else ""
        if url and not (url.startswith("http://") or url.startswith("https://")):
            url = ""
            
        paper_id = raw_data.get("id") or raw_data.get("paperId") or doi or url or title
        paper_id = re.sub(r'[^a-zA-Z0-9_-]', '_', str(paper_id).strip())
        if not paper_id:
            return None
            
        return Paper(
            id=paper_id,
            title=title,
            abstract=abstract,
            authors=authors,
            year=year,
            venue=venue,
            citationCount=citation_count,
            doi=doi,
            url=url,
            source=source
        )
    except Exception:
        return None

def deduplicate_papers(papers: List[Paper]) -> List[Paper]:
    """
    Deduplicates a list of Paper objects by DOI, URL, or Jaccard similarity of titles.
    """
    unique_papers = []
    for paper in papers:
        is_dup = False
        for existing in unique_papers:
            # Match by DOI
            if paper.doi and existing.doi and paper.doi.lower() == existing.doi.lower():
                is_dup = True
                break
            # Match by URL
            if paper.url and existing.url and paper.url.lower() == existing.url.lower():
                is_dup = True
                break
            # Match by title Jaccard similarity (0.85 threshold)
            if jaccard_similarity(paper.title, existing.title) > 0.85:
                is_dup = True
                break
        if not is_dup:
            unique_papers.append(paper)
    return unique_papers
