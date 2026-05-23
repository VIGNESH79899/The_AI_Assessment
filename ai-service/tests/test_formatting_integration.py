import os
from utils.document_service import fill_reflective_journal
from pathlib import Path

def test_formatting():
    template_path = "templates/standard_assignment.docx"
    output_path = "output/Formatting_Test.docx"
    
    data = {
        "document_name": "Formatting_Test",
        "journal_topic": "The Impact of AI on Formatting",
        "date": "May 2026",
        "student_details": {
            "student_name": "John Doe",
            "course_name": "Academic Writing 101",
            "instructor": "Dr. Smith",
            "assessment": "Reflective Journal",
        },
        "generated_content": {
            "experience": "This is a long paragraph about my experience. It should be justified and have 1.5 line spacing. " * 5,
            "feelings": "Inline Heading:\n\nThis is a paragraph following an inline heading. It should be Bookman Old Style size 12.",
            "learning": "a) First Point:\n\nDetailed explanation of the first point.\n\nb) Second Point:\n\nDetailed explanation of the second point.",
            "application": "• Application 1\n• Application 2",
            "conclusion": "Final thoughts on the topic."
        }
    }
    
    if not os.path.exists(template_path):
        print(f"Skipping test: {template_path} not found.")
        return

    final_path = fill_reflective_journal(template_path, output_path, data)
    print(f"Test document generated: {final_path}")

if __name__ == "__main__":
    test_formatting()
