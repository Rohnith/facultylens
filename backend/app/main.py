"""FastAPI app factory. Imports no ML libraries: models load lazily via app.nlp.registry."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app import db
from app.config import get_settings
from app.limiter import limiter
from app.routers import health

log = logging.getLogger("facultylens")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if await db.ping():
        await db.ensure_indexes()
    else:
        log.warning("MongoDB is unreachable at startup; /api/health will report degraded.")
    yield
    await db.close_client()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, version=settings.app_version, lifespan=lifespan)
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_origin],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health.router, prefix="/api")
    return app


app = create_app()
