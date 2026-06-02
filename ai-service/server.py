import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from the same directory as this file
load_dotenv(dotenv_path=Path(__file__).parent / ".env", override=True)

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uuid
import time
from typing import List, Dict, Any
from agents.workflow import DynamicAssignmentWorkflow, FreeWritingWorkflow
from agents.literature_survey_workflow import LiteratureSurveyWorkflow
from utils.document_service import fill_reflective_journal, fill_free_writing, fill_literature_survey
from services.literature.search_manager import global_search_manager
from main import sanitize_filename, _resolve_template_path
from utils.logger import get_logger

logger = get_logger("ServerBoot")

app = FastAPI(title="Assignment AI Backend")

# Record startup timestamp
startup_time = time.time()

# Allow the Vite dev server origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:8080",
        "https://assessment-backend-zttm.onrender.com",
        "https://assessmentmaker.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUT_DIR = Path(__file__).parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)


class GenerateRequest(BaseModel):
    student_name: str = ""
    academic_year: str = ""
    registration_number: str = ""
    year_term: str = ""
    study_level: str = ""
    class_section: str = ""
    course_name: str = ""
    instructor: str = ""
    assessment: str = ""
    date: str = ""
    topic: str = "Reflective Journal Topic"
    additional_instructions: str = ""
    document_name: str = ""
    template_path: str = ""


@app.on_event("startup")
async def startup_event():
    # Verify environment variables
    groq_key = os.getenv("GROQ_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")
    
    if not groq_key:
        logger.critical("[STARTUP] FAIL-FAST: GROQ_API_KEY is not configured in the environment.")
        raise RuntimeError("GROQ_API_KEY is missing from the environment.")
        
    if not gemini_key:
        logger.critical("[STARTUP] FAIL-FAST: GEMINI_API_KEY is not configured in the environment.")
        raise RuntimeError("GEMINI_API_KEY is missing from the environment.")

    # Verify required directories exist
    OUTPUT_DIR.mkdir(exist_ok=True)
    templates_dir = Path(__file__).parent / "templates"
    templates_dir.mkdir(exist_ok=True)
    
    logger.info("[STARTUP] Safe boot validation completed successfully.")


@app.get("/health")
async def health_check():
    uptime = int(time.time() - startup_time)
    return {
        "status": "ok",
        "uptime_seconds": uptime,
        "version": "1.0.0"
    }


@app.get("/providers/health")
async def providers_health():
    from providers.fallback_provider import global_groq_breaker
    is_groq_tripped = global_groq_breaker.is_tripped()
    return {
        "groq": {
            "status": "degraded" if is_groq_tripped else "healthy",
            "circuit_breaker_tripped": is_groq_tripped
        },
        "gemini": {
            "status": "healthy" if os.getenv("GEMINI_API_KEY") else "unconfigured"
        }
    }


@app.get("/providers/stats")
async def providers_stats():
    from providers.metrics import global_metrics
    return global_metrics.get_stats()


@app.post("/generate-assignment")
async def generate(req: GenerateRequest, x_internal_service_token: str = Header(default="")):
    expected_token = os.getenv("AI_SERVICE_TOKEN")
    if expected_token and x_internal_service_token != expected_token:
        raise HTTPException(status_code=403, detail="Invalid internal service token")

    if not os.getenv("GROQ_API_KEY"):
        raise HTTPException(status_code=400, detail="GROQ_API_KEY not set on server")

    request_id = str(uuid.uuid4())
    logger.info(f"[{request_id}] Generation request received for topic: {req.topic}")

    # Determine filename
    raw_name = (req.document_name or "Journal_Document").strip()
    if not raw_name:
        raw_name = "Journal_Document"
    filename = sanitize_filename(raw_name)
    if not filename.lower().endswith(".docx"):
        filename += ".docx"

    # Resolve template
    template_path = _resolve_template_path(req.template_path or "")
    if not template_path.exists():
        raise HTTPException(status_code=400, detail=f"Template not found: {template_path}")

    # Generate content via workflow
    ai_topic = f"{req.topic}\n\n[Additional Instructions]:\n{req.additional_instructions}" if req.additional_instructions else req.topic
    workflow = DynamicAssignmentWorkflow(topic=ai_topic)
    try:
        ai_output = workflow.execute(request_id=request_id)
    except Exception as e:
        logger.error(f"[{request_id}] AI generation failed; using fallback document content: {e}")
        ai_output = workflow._fallback_payload()

    data = {
        "document_name": filename,
        "journal_topic": req.topic,
        "date": req.date,
        "student_details": {
            "student_name": req.student_name,
            "academic_year": req.academic_year,
            "registration_number": req.registration_number,
            "year_term": req.year_term,
            "study_level": req.study_level,
            "class_section": req.class_section,
            "course_name": req.course_name,
            "instructor": req.instructor,
            "assessment": req.assessment,
        },
        "generated_content": ai_output,
    }

    output_path = str(OUTPUT_DIR / filename)
    try:
        final_path = fill_reflective_journal(str(template_path), output_path, data)
    except Exception as e:
        logger.error(f"[{request_id}] DOCX generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"DOCX generation failed: {e}")

    return {"url": f"/download/{Path(final_path).name}", "sections_count": 5}


class GenerateFreeWritingRequest(BaseModel):
    student_name: str = ""
    academic_year: str = ""
    registration_number: str = ""
    year_term: str = ""
    study_level: str = ""
    class_section: str = ""
    course_name: str = ""
    instructor: str = ""
    assessment: str = ""
    date: str = ""
    topic: str = "Free Writing Topic"
    additional_instructions: str = ""
    academic_domain: str = ""
    document_name: str = ""
    template_path: str = ""


@app.post("/api/generate-free-writing")
async def generate_free_writing(req: GenerateFreeWritingRequest, x_internal_service_token: str = Header(default="")):
    expected_token = os.getenv("AI_SERVICE_TOKEN")
    if expected_token and x_internal_service_token != expected_token:
        raise HTTPException(status_code=403, detail="Invalid internal service token")

    if not os.getenv("GROQ_API_KEY"):
        raise HTTPException(status_code=400, detail="GROQ_API_KEY not set on server")

    request_id = str(uuid.uuid4())
    logger.info(f"[{request_id}] Free writing generation request received for topic: {req.topic}")

    # Determine filename
    raw_name = (req.document_name or "FreeWriting_Document").strip()
    if not raw_name:
        raw_name = "FreeWriting_Document"
    filename = sanitize_filename(raw_name)
    if not filename.lower().endswith(".docx"):
        filename += ".docx"

    # Resolve template
    template_path = _resolve_template_path(req.template_path or "")

    # Generate content via workflow
    ai_topic = f"{req.topic}\n\n[Additional Instructions]:\n{req.additional_instructions}" if req.additional_instructions else req.topic
    workflow = FreeWritingWorkflow(topic=ai_topic, course_name=req.course_name, academic_domain=req.academic_domain)
    try:
        ai_output = workflow.execute(request_id=request_id)
    except Exception as e:
        logger.error(f"[{request_id}] AI generation failed; using fallback document content: {e}")
        ai_output = workflow._fallback_payload()

    data = {
        "document_name": filename,
        "free_writing_topic": req.topic,
        "date": req.date,
        "student_details": {
            "student_name": req.student_name,
            "academic_year": req.academic_year,
            "registration_number": req.registration_number,
            "year_term": req.year_term,
            "study_level": req.study_level,
            "class_section": req.class_section,
            "course_name": req.course_name,
            "instructor": req.instructor,
            "assessment": req.assessment or "Free Writing Assessment",
        },
        "generated_content": ai_output,
    }

    output_path = str(OUTPUT_DIR / filename)
    try:
        t_path = str(template_path) if (req.template_path and template_path.exists()) else str(Path(__file__).parent / "templates" / "standard_assignment.docx")
        final_path = fill_free_writing(t_path, output_path, data)
    except Exception as e:
        logger.error(f"[{request_id}] DOCX generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"DOCX generation failed: {e}")

    sections_count = 0
    if isinstance(ai_output, dict):
        sections_count = len(ai_output.get("sections", []))
    elif isinstance(ai_output, list):
        sections_count = len(ai_output)

    return {"url": f"/download/{Path(final_path).name}", "sections_count": sections_count}


class GenerateLiteratureSurveyRequest(BaseModel):
    student_name: str = ""
    academic_year: str = ""
    registration_number: str = ""
    year_term: str = ""
    study_level: str = ""
    class_section: str = ""
    course_name: str = ""
    instructor: str = ""
    assessment: str = ""
    date: str = ""
    topic: str = "Literature Survey Topic"
    additional_instructions: str = ""
    document_name: str = ""
    template_path: str = ""
    selected_papers: List[Dict[str, Any]] = []


@app.get("/api/literature/search")
async def search_literature(q: str):
    if not q or len(q.strip()) < 3:
        raise HTTPException(status_code=400, detail="Query search term must be at least 3 characters.")
    try:
        results = global_search_manager.search(q.strip())
        return {"results": [p.dict() for p in results]}
    except Exception as e:
        logger.error(f"Error during literature search: {e}")
        return {"results": [], "error": str(e)}


@app.post("/api/literature/generate-survey")
async def generate_literature_survey(req: GenerateLiteratureSurveyRequest, x_internal_service_token: str = Header(default="")):
    expected_token = os.getenv("AI_SERVICE_TOKEN")
    if expected_token and x_internal_service_token != expected_token:
        raise HTTPException(status_code=403, detail="Invalid internal service token")

    if not os.getenv("GROQ_API_KEY"):
        raise HTTPException(status_code=400, detail="GROQ_API_KEY not set on server")

    if not req.selected_papers:
        raise HTTPException(status_code=400, detail="At least one selected paper must be provided.")

    request_id = str(uuid.uuid4())
    logger.info(f"[{request_id}] Literature survey generation request received for topic: {req.topic}")

    # Determine filename
    raw_name = (req.document_name or "LiteratureSurvey_Document").strip()
    if not raw_name:
        raw_name = "LiteratureSurvey_Document"
    filename = sanitize_filename(raw_name)
    if not filename.lower().endswith(".docx"):
        filename += ".docx"

    # Resolve template
    template_path = _resolve_template_path(req.template_path or "")

    # Generate content via workflow
    ai_topic = f"{req.topic}\n\n[Additional Instructions]:\n{req.additional_instructions}" if req.additional_instructions else req.topic
    workflow = LiteratureSurveyWorkflow(
        topic=ai_topic,
        course_name=req.course_name,
        selected_papers=req.selected_papers,
        academic_domain=""
    )
    try:
        ai_output = workflow.execute(request_id=request_id)
    except Exception as e:
        logger.error(f"[{request_id}] AI survey generation failed; using fallback document content: {e}")
        ai_output = workflow._fallback_payload()
        fallback_papers = []
        for p in req.selected_papers:
            title = p.get("title", "")
            abstract = p.get("abstract", "")
            snippet = abstract[:300] + "..." if abstract and len(abstract) > 300 else (abstract or "")
            fallback_papers.append({
                "title": title,
                "authors": ", ".join(p.get("authors", [])) if isinstance(p.get("authors"), list) else str(p.get("authors") or ""),
                "year": str(p.get("year", "")),
                "abstract_summary": f"This study explores {title} and focuses on key academic contributions and methodologies. Abstract: {snippet}" if snippet else f"This study explores key concepts in {title}.",
                "methodology": "The study employs experimental evaluation and quantitative analysis using datasets relevant to the domain.",
                "advantages": "Demonstrates potential improvements in performance and system capability.",
                "limitations": "Requires further evaluation in large-scale production scenarios.",
                "url": p.get("url", ""),
                "doi": p.get("doi", ""),
                "source": p.get("source", "")
            })
        ai_output["papers"] = fallback_papers

    data = {
        "document_name": filename,
        "topic": req.topic,
        "date": req.date,
        "student_details": {
            "student_name": req.student_name,
            "academic_year": req.academic_year,
            "registration_number": req.registration_number,
            "year_term": req.year_term,
            "study_level": req.study_level,
            "class_section": req.class_section,
            "course_name": req.course_name,
            "instructor": req.instructor,
            "assessment": req.assessment or "Literature Survey Assessment",
        },
        "generated_content": ai_output,
    }

    output_path = str(OUTPUT_DIR / filename)
    try:
        t_path = str(template_path) if (req.template_path and template_path.exists()) else str(Path(__file__).parent / "templates" / "standard_literature.docx")
        final_path = fill_literature_survey(t_path, output_path, data)
    except Exception as e:
        logger.error(f"[{request_id}] DOCX generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"DOCX generation failed: {e}")

    return {"url": f"/download/{Path(final_path).name}", "sections_count": 6}


# Serve generated files
app.mount("/output", StaticFiles(directory=str(OUTPUT_DIR)), name="output")

@app.get("/download/{filename}")
async def download(filename: str):
    file_path = OUTPUT_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path=str(file_path), filename=filename, media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document')


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
