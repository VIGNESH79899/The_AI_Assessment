"""
Main entrypoint for reflective journal generation.
"""

import os
import json
import re
from pathlib import Path

from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from the same directory as this file
load_dotenv(dotenv_path=Path(__file__).parent / ".env", override=True)

from agents.workflow import DynamicAssignmentWorkflow
from utils.document_service import fill_reflective_journal
from utils.logger import get_logger
logger = get_logger("SystemPipeline")


def _resolve_template_path(user_value: str) -> Path:
    base_dir = Path(__file__).parent
    if user_value:
        candidate = Path(user_value)
        if not candidate.is_absolute():
            candidate = base_dir / candidate
        return candidate
    return base_dir / "templates" / "standard_assignment.docx"


def sanitize_filename(text: str) -> str:
    # Rule 4: Sanitization (SAFE HANDLING)
    # Replace invalid filename characters: \ / : * ? " < > | → "_"
    invalid_chars = r'[\\/:*?"<>|]'
    text = re.sub(invalid_chars, "_", text)
    # Trim extra spaces
    text = text.strip()
    # Limit length to 100 characters
    if len(text) > 100:
        text = text[:100]
    return text


def get_user_inputs() -> dict:
    print("=" * 60)
    print("AI Reflective Journal Generator")
    print("=" * 60)

    student_name = input("Enter Student Name: ").strip()
    course_name = input("Enter Course Name: ").strip()
    instructor = input("Enter Instructor Name: ").strip()
    assessment = input("Enter Assessment Name: ").strip()
    date = input("Enter Submission Date: ").strip()
    topic = input("Enter Topic: ").strip()
    document_name = input("Enter Output Document Name (e.g., MyJournal): ").strip()
    template_path = input(
        "Enter template path (Press ENTER for templates/standard_assignment.docx): "
    ).strip()

    return {
        "student_name": student_name,
        "course_name": course_name,
        "instructor": instructor,
        "assessment": assessment,
        "date": date,
        "topic": topic,
        "document_name": document_name,
        "template_path": template_path,
    }


def main() -> None:
    if not os.getenv("GROQ_API_KEY"):
        print("Error: Please set GROQ_API_KEY in your .env file.")
        return

    user_inputs = get_user_inputs()
    topic = user_inputs.get("topic", "").strip() or "Reflective Journal Topic"
    template_path = _resolve_template_path(user_inputs.get("template_path", ""))
    
    # Rule 2 & 5: File Naming Rule and Fallback
    raw_document_name = user_inputs.get("document_name", "").strip()
    if not raw_document_name:
        document_name = "Journal_Document"
    else:
        document_name = sanitize_filename(raw_document_name)
    
    # Append .docx automatically
    if not document_name.lower().endswith(".docx"):
        document_name += ".docx"
    
    if not template_path.exists():
        print(f"Error: Template file not found at {template_path}")
        return

    logger.info("Running reflective journal AI pipeline...")
    workflow = DynamicAssignmentWorkflow(topic=topic)
    ai_output = workflow.execute()

    # Input Contract Mapping
    data = {
        "document_name": document_name,
        "journal_topic": topic,
        "date": user_inputs.get("date", ""),
        "student_details": {
            "student_name": user_inputs.get("student_name", ""),
            "course_name": user_inputs.get("course_name", ""),
            "instructor": user_inputs.get("instructor", ""),
            "assessment": user_inputs.get("assessment", ""),
        },
        "generated_content": ai_output
    }

    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    output_path = str(output_dir / document_name)
    
    try:
        final_path = fill_reflective_journal(str(template_path), output_path, data)
        print("\n" + "=" * 60)
        print("Success! Reflective journal generated.")
        print(f"Output File: {final_path}")
        print("=" * 60 + "\n")
    except Exception as e:
        logger.error(f"Failed to generate DOCX: {e}")
        print(f"\nError: {e}")


if __name__ == "__main__":
    main()
