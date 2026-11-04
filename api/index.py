import sys
import os

# Add apps/backend directory to Python search path so 'app' is importable
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_path = os.path.abspath(os.path.join(current_dir, "..", "apps", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.main import app
