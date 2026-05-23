"""
Standalone test to verify the Groq LLM initializes and responds correctly.
Run: python tests/test_llm.py
"""

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv(override=True)

from utils.llm import get_llm

def test_llm_initialization():
    """Verify Groq LLM boots and responds."""
    print("Testing Groq LLM initialization...")
    try:
        llm = get_llm()
        print(f"[PASS] LLM object created: {type(llm).__name__}")
    except Exception as e:
        print(f"[FAIL] LLM initialization FAILED: {e}")
        return

    print("Testing a simple LLM invocation...")
    try:
        from langchain_core.messages import HumanMessage
        response = llm.invoke([HumanMessage(content="Say hello in one word.")])
        print(f"[PASS] LLM responded: {response.content}")
    except Exception as e:
        print(f"[FAIL] LLM invocation FAILED: {e}")

if __name__ == "__main__":
    test_llm_initialization()
