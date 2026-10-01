import contextlib
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.config import settings
from app.db.database import get_db_connection
from app.db.schema import init_db
from app.api.v1 import auth, attendance, leaves, reports, settings as api_settings

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
            "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org https://telegram.org;"
        )
        return response

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure DB tables and seed data
    conn = get_db_connection()
    try:
        init_db(conn)
    finally:
        conn.close()
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

    # CORS configuration - pinned to real origins, no wildcard reflection
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # Health check
    @app.get("/api/health", tags=["Health"])
    def health():
        return {"ok": True, "version": settings.VERSION}

    # Mount API routers under /api
    app.include_router(auth.router, prefix="/api")
    app.include_router(attendance.router, prefix="/api")
    app.include_router(leaves.router, prefix="/api")
    app.include_router(reports.router, prefix="/api")
    app.include_router(api_settings.router, prefix="/api")

    return app

app = create_app()
