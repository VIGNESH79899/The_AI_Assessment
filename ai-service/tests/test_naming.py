from main import sanitize_filename

def test_naming_logic():
    # Test cases for sanitization
    test_cases = [
        ("My/File:Name*", "My_File_Name_"),
        ("  Spaces  ", "Spaces"),
        ("a" * 150, "a" * 100),
        ("Valid_Name", "Valid_Name"),
    ]
    
    for input_name, expected in test_cases:
        result = sanitize_filename(input_name)
        print(f"Input: '{input_name}' -> Result: '{result}'")
        assert result == expected
    
    print("All naming logic tests passed!")

if __name__ == "__main__":
    test_naming_logic()
