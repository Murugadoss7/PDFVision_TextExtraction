import sys
import os

# Add the project root to the Python path to allow imports from Backend.app
# This assumes conftest.py is in Backend/tests/
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
APP_DIR = os.path.join(PROJECT_ROOT, 'Backend') # Path to the Backend directory

if APP_DIR not in sys.path:
    sys.path.insert(0, APP_DIR)

# If you have a structure like Backend/app, and want to import app.services
# ensure Backend itself is on the path for `from Backend.app.services...`
# or ensure Backend/app is on the path for `from app.services...`
# The current tests use `from Backend.app.services...`, so `PROJECT_ROOT` should be sufficient if it points to PDFVision_TextExtraction folder.
# Let's refine to ensure `Backend` folder's parent is on path so `Backend.app...` works

# Correct path assuming conftest.py is in PDFVision_TextExtraction/Backend/tests/
# We want PDFVision_TextExtraction on the path

ACTUAL_PROJECT_ROOT_FOR_BACKEND_IMPORT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')) 
# This makes PDFVision_TextExtraction the root for imports like Backend.app

if ACTUAL_PROJECT_ROOT_FOR_BACKEND_IMPORT not in sys.path:
    sys.path.insert(0, ACTUAL_PROJECT_ROOT_FOR_BACKEND_IMPORT)

print(f"PYTHONPATH extended with: {ACTUAL_PROJECT_ROOT_FOR_BACKEND_IMPORT}")
print(f"Current sys.path: {sys.path}") 