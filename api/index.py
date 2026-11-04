from fastapi import FastAPI
from fastapi.responses import PlainTextResponse
import traceback
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
backend_path = os.path.abspath(os.path.join(current_dir, "..", "apps", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

import_error = None
try:
    from app.main import app as original_app
except Exception as e:
    import_error = traceback.format_exc()
    original_app = None

app = FastAPI()

if original_app is not None:
    app.mount("/", original_app)
else:
    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
    def catch_error(path: str):
        return PlainTextResponse(f"FastAPI Import Error:\n{import_error}\n\nsys.path:\n{sys.path}\n\nbackend_path exists: {os.path.exists(backend_path)}", status_code=500)
