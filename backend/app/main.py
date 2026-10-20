"""FastAPI app factory. Imports no ML libraries: models load lazily via app.nlp.registry."""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app import db
from app.config import get_settings
from app.limiter import limiter
from app.pipeline import jobs
from app.routers import (
    analysis,
    auth,
    courses,
    cycles,
    departments,
    feedback,
    forms,
    health,
    profiles,
    users,
)

log = logging.getLogger("facultylens")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if await db.ping():
        await db.ensure_indexes()
        # Jobs a previous process left half-done; their finished responses are cached.
        stale = await asyncio.to_thread(jobs.mark_interrupted)
        if stale:
            log.info("Marked %s unfinished analysis jobs as interrupted.", stale)
    else:
        log.warning("MongoDB is unreachable at startup; /api/health will report degraded.")
    yield
    await db.close_client()
    db.close_sync_client()


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
    for module in (
        health,
        auth,
        users,
        departments,
        courses,
        profiles,
        cycles,
        forms,
        feedback,
        analysis,
    ):
        app.include_router(module.router, prefix="/api")
    return app


app = create_app()
