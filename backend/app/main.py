import logging
import logging.config
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import init_db
from app.routers import (
    analytics_router,
    auth_router,
    documentation_router,
    org_router,
    project_router,
    security_router,
    settings_router,
)

LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            "datefmt": "%Y-%m-%dT%H:%M:%S",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "default",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "app": {"level": "DEBUG", "propagate": True},
        "uvicorn.access": {"level": "WARNING", "propagate": True},
    },
}

logging.config.dictConfig(LOGGING_CONFIG)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("GitAudit API starting up")
    await init_db()
    logger.info("Database initialized")
    yield
    logger.info("GitAudit API shutting down")


app = FastAPI(
    title="GitAudit API",
    description="Engineering Productivity & PR Analytics Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_logging_handler(request: Request, exc: HTTPException):
    if exc.status_code >= 500:
        logger.error("HTTP %d error on %s %s: %s", exc.status_code, request.method, request.url.path, exc.detail)
    elif exc.status_code >= 400:
        logger.warning("HTTP %d warning on %s %s: %s", exc.status_code, request.method, request.url.path, exc.detail)
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(Exception)
async def unhandled_exception_logging_handler(request: Request, exc: Exception):
    logger.error("Unhandled error processing %s %s: %s", request.method, request.url.path, str(exc), exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})


app.include_router(auth_router, prefix="/api")
app.include_router(org_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(documentation_router, prefix="/api")
app.include_router(project_router, prefix="/api")
app.include_router(security_router, prefix="/api")
app.include_router(settings_router, prefix="/api")



@app.get("/health", tags=["Health"])
async def health():
    logger.debug("Health check requested")
    return {"status": "ok"}
