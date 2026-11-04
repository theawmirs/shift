import contextlib
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.datastructures import Headers
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.config import settings
from app.db.database import get_db_connection
from app.db.schema import init_db
from app.api.v1 import auth, attendance, leaves, reports, settings as api_settings

class StrictCORSMiddleware(CORSMiddleware):
    def preflight_response(self, request_headers: Headers) -> Response:
        resp = super().preflight_response(request_headers)
        # Only emit Access-Control headers (especially credentials) alongside a validated origin
        if "access-control-allow-origin" not in resp.headers:
            for k in list(resp.headers.keys()):
                if k.lower().startswith("access-control-"):
                    del resp.headers[k]
        return resp

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://telegram.org; "
            "style-src 'self' 'unsafe-inline'; "
            "font-src 'self' data:; "
            "img-src 'self' data: blob: https://*.telegram.org; "
            "connect-src 'self' https://staging.att.pawndancertt.tech https://att.pawndancertt.tech https://*.telegram.org; "
            "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org https://telegram.org; "
            "report-uri /api/csp-report;"
        )
        return response

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure DB tables and seed data
    try:
        conn = get_db_connection()
        try:
            init_db(conn)
        finally:
            conn.close()
    except Exception as e:
        print(f"[STARTUP DB INIT WARNING] {e}")
    yield
    # Shutdown logic if any

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        description="Modular FastAPI backend for Worktime tracker with Swagger UI, ReDoc, and tenant isolation.",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # Security headers middleware
    app.add_middleware(SecurityHeadersMiddleware)

    # CORS configuration - pinned to real origins, no credentials without validated origin
    app.add_middleware(
        StrictCORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # Health check
    @app.get("/api/health", tags=["Health"])
    def health():
        return {"ok": True, "version": settings.VERSION}

    # CSP Violation Reporting
    @app.post("/api/csp-report", tags=["Telemetry"], status_code=204)
    async def csp_report(request: Request):
        return Response(status_code=204)

    # Mount API routers under /api
    app.include_router(auth.router, prefix="/api")
    app.include_router(attendance.router, prefix="/api")
    app.include_router(leaves.router, prefix="/api")
    app.include_router(reports.router, prefix="/api")
    app.include_router(api_settings.router, prefix="/api")

    return app

app = create_app()
