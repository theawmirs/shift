import contextlib
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.database import get_db_connection
from app.db.schema import init_db
from app.api.v1 import auth, attendance, leaves, reports, settings as api_settings

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

    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
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
