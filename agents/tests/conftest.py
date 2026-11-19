"""
Make the agents tests runnable from either the repo root or agents/.

Some tests import through the package (`agents.predictors...`), which needs
the repo root on sys.path; others import modules the way app.py does
(`ocr.service`), which needs agents/ on sys.path. Both are added here.
"""

import sys
from pathlib import Path

AGENTS_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = AGENTS_DIR.parent

for path in (str(AGENTS_DIR), str(REPO_ROOT)):
    if path not in sys.path:
        sys.path.insert(0, path)

# tool_test.py is a manual Ollama tool-calling experiment, not a test: it
# needs the `ollama` package and a local model server, so pytest skips it.
collect_ignore = ["tool_test.py"]
