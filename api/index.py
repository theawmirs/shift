import sys
import os
import traceback

current_dir = os.path.dirname(os.path.abspath(__file__))
# Check possible backend paths (root or lambda deployment)
backend_path = os.path.abspath(os.path.join(current_dir, "..", "apps", "backend"))
alt_backend_path = os.path.abspath(os.path.join(current_dir, "apps", "backend"))

for p in [backend_path, alt_backend_path, current_dir]:
    if os.path.exists(p) and p not in sys.path:
        sys.path.insert(0, p)

try:
    from app.main import app
except Exception as e:
    err_tb = traceback.format_exc()
    from fastapi import FastAPI
    from fastapi.responses import PlainTextResponse
    app = FastAPI()
    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
    def catch_all(path: str):
        try:
            parent_list = os.listdir(os.path.abspath(os.path.join(current_dir, '..')))
        except Exception as pe:
            parent_list = str(pe)
        try:
            curr_list = os.listdir(current_dir)
        except Exception as ce:
            curr_list = str(ce)
        debug_info = f"Startup Error:\n{err_tb}\n\nCurrent dir: {current_dir}\nParent dir listing: {parent_list}\nCurrent dir listing: {curr_list}\nsys.path: {sys.path}"
        return PlainTextResponse(debug_info, status_code=500)
