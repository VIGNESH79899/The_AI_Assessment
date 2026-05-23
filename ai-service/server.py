from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from pathlib import Path
import uuid
import os

from agents.workflow import DynamicAssignmentWorkflow, FreeWritingWorkflow
from utils.document_service import fill_reflective_journal, fill_free_writing
from main import sanitize_filename, _resolve_template_path

app = FastAPI(title="Assignment AI Backend")

# Allow the Vite dev server origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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


@app.post("/api/generate")
async def generate(req: GenerateRequest, x_internal_service_token: str = Header(default="")):
    expected_token = os.getenv("AI_SERVICE_TOKEN")
    if expected_token and x_internal_service_token != expected_token:
        raise HTTPException(status_code=403, detail="Invalid internal service token")

    if not os.getenv("GROQ_API_KEY"):
        raise HTTPException(status_code=400, detail="GROQ_API_KEY not set on server")

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
        ai_output = workflow.execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {e}")

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
        ai_output = workflow.execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {e}")

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
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"DOCX generation failed: {e}")

    sections_count = 0
    if isinstance(ai_output, dict):
        sections_count = len(ai_output.get("sections", []))
    elif isinstance(ai_output, list):
        sections_count = len(ai_output)

    return {"url": f"/download/{Path(final_path).name}", "sections_count": sections_count}


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
