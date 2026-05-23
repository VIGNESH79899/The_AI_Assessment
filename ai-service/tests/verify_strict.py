from docx import Document

def verify_strict_mapping(file_path, expected_topic):
    doc = Document(file_path)
    print(f"Verifying Strict Mapping for {file_path}")
    
    topic_found = False
    for table in doc.tables:
        for row in table.rows:
            for i, cell in enumerate(row.cells):
                if "journal entry topic" in cell.text.lower():
                    topic_found = True
                    text = cell.text.strip()
                    if ":" in text:
                        val = text.split(":", 1)[1].strip()
                        print(f"Topic found in same cell: '{val}'")
                        assert val == expected_topic
                    elif i + 1 < len(row.cells):
                        val = row.cells[i+1].text.strip()
                        print(f"Topic found in next cell: '{val}'")
                        assert val == expected_topic
    
    if not topic_found:
        print("CRITICAL: Topic field not found in document!")
    else:
        print("SUCCESS: Topic matches expected input exactly.")

if __name__ == "__main__":
    verify_strict_mapping("output/Formatting_Test.docx", "The Impact of AI on Formatting")
