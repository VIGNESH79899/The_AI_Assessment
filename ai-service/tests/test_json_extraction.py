import unittest

from main import extract_json as extract_json_main
from agents.workflow import extract_json as extract_json_workflow


class TestJsonExtraction(unittest.TestCase):
    def test_extract_json_from_final_answer_wrapper(self):
        raw = (
            'Final Answer: {"experience":"E","feelings":"F","learning":"L",'
            '"application":"A","conclusion":"C"}'
        )
        parsed_main = extract_json_main(raw)
        parsed_workflow = extract_json_workflow(raw)

        self.assertEqual(parsed_main.get("experience"), "E")
        self.assertEqual(parsed_main.get("conclusion"), "C")
        self.assertEqual(parsed_workflow.get("learning"), "L")
        self.assertEqual(parsed_workflow.get("application"), "A")


if __name__ == "__main__":
    unittest.main()
