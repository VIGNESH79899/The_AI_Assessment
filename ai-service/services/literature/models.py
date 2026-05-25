from pydantic import BaseModel
from typing import List, Optional

class Paper(BaseModel):
    id: str
    title: str
    abstract: str
    authors: List[str]
    year: int
    venue: str
    citationCount: int
    doi: str
    url: str
    source: str  # "semantic_scholar" | "arxiv"
