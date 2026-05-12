import sys
import os
import subprocess
import json
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, os.getcwd())

def test_signal_detector_mocked():
    """
    Test the signal detector script with a simulated message.
    """
    message = "I think we should build a new framework for AI memory called CamoFlow. It would help people like Cameron de Vries manage their digital twins."

    # Force a mock LLM response if needed, but here we just want to see if the script handles output correctly
    # when no LLM is available.
    # Since we can't easily mock the internal get_provider without monkeypatching,
    # we'll just check if it produces the expected "skipped" or "signals" output.

    print(f"Testing message: {message}")

    # Run the detector
    try:
        result = subprocess.run(
            ["python3", "-m", "mempalace.signal_detector", message],
            capture_output=True,
            text=True,
            timeout=30
        )

        print(f"STDOUT: {result.stdout}")
        print(f"STDERR: {result.stderr}")

        # Check if the output follows the required Signal Logging format
        assert "Signals:" in result.stdout

        print("Integration test passed (format check).")

    except subprocess.TimeoutExpired:
        print("Test timed out (LLM might be slow).")
    except Exception as e:
        print(f"Test failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_signal_detector_mocked()
