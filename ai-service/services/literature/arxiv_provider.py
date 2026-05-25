import time
import httpx
import xml.etree.ElementTree as ET
from typing import List, Dict, Any
from utils.logger import get_logger

logger = get_logger("ArxivProvider")

class ArxivProvider:
    def __init__(self):
        self.api_url = "http://export.arxiv.org/api/query"
        self.timeout = 10.0

    def search(self, query: str) -> List[Dict[str, Any]]:
        params = {
            "search_query": f"all:{query}",
            "max_results": 30
        }

        for attempt in range(1, 3):
            try:
                logger.info(f"Querying arXiv (attempt {attempt}): q={query}")
                with httpx.Client(timeout=self.timeout) as client:
                    response = client.get(self.api_url, params=params)
                    response.raise_for_status()
                    
                    xml_data = response.text
                    # Parse XML defensively
                    root = ET.fromstring(xml_data)
                    
                    # Namespaces for Atom feed
                    namespaces = {
                        'atom': 'http://www.w3.org/2005/Atom',
                        'arxiv': 'http://arxiv.org/schemas/atom'
                    }
                    
                    entries = root.findall('atom:entry', namespaces)
                    papers = []
                    
                    for entry in entries:
                        # Extract title
                        title_el = entry.find('atom:title', namespaces)
                        title = title_el.text.strip() if title_el is not None and title_el.text else ""
                        # Remove newlines and excess spaces from titles
                        title = " ".join(title.split())
                        
                        # Extract summary (abstract)
                        summary_el = entry.find('atom:summary', namespaces)
                        abstract = summary_el.text.strip() if summary_el is not None and summary_el.text else ""
                        # Clean summary whitespace
                        abstract = " ".join(abstract.split())
                        
                        # Extract year
                        published_el = entry.find('atom:published', namespaces)
                        year = 2025
                        if published_el is not None and published_el.text:
                            try:
                                year = int(published_el.text.split('-')[0])
                            except:
                                pass
                                
                        # Extract authors
                        authors = []
                        author_els = entry.findall('atom:author', namespaces)
                        for author_el in author_els:
                            name_el = author_el.find('atom:name', namespaces)
                            if name_el is not None and name_el.text:
                                authors.append(name_el.text.strip())
                                
                        # Extract link/url
                        url = ""
                        id_el = entry.find('atom:id', namespaces)
                        if id_el is not None and id_el.text:
                            url = id_el.text.strip()
                        # Prefer alternate HTML link if present
                        links = entry.findall('atom:link', namespaces)
                        for link in links:
                            if link.attrib.get('rel') == 'alternate' or link.attrib.get('type') == 'text/html':
                                url = link.attrib.get('href', url)
                                
                        # Extract DOI if present
                        doi = ""
                        doi_el = entry.find('arxiv:doi', namespaces)
                        if doi_el is not None and doi_el.text:
                            doi = doi_el.text.strip()
                            
                        # Clean ID
                        paper_id = url.split('/abs/')[-1] if '/abs/' in url else url
                        
                        papers.append({
                            "id": paper_id,
                            "title": title,
                            "abstract": abstract,
                            "authors": authors,
                            "year": year,
                            "venue": "ArXiv",
                            "citationCount": 0,
                            "doi": doi,
                            "url": url
                        })
                    logger.info(f"arXiv returned {len(papers)} raw results.")
                    return papers
            except Exception as e:
                logger.warning(f"arXiv attempt {attempt} failed: {e}")
                if attempt == 1:
                    time.sleep(1)
                    continue
        return []
