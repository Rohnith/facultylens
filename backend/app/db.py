"""MongoDB access through the PyMongo Async API, plus every index from SPEC §9."""

from pymongo import ASCENDING, DESCENDING, AsyncMongoClient, IndexModel
from pymongo.asynchronous.database import AsyncDatabase

from app.config import get_settings

_client: AsyncMongoClient | None = None

# collection -> indexes (SPEC §9)
INDEXES: dict[str, list[IndexModel]] = {
    "users": [
        IndexModel([("email", ASCENDING)], unique=True, name="email_unique"),
        IndexModel([("roll_no", ASCENDING)], unique=True, sparse=True, name="roll_no_unique"),
    ],
    "departments": [IndexModel([("code", ASCENDING)], unique=True, name="code_unique")],
    "courses": [IndexModel([("code", ASCENDING), ("semester", ASCENDING)], name="code_semester")],
    "faculty_profiles": [IndexModel([("user_id", ASCENDING)], unique=True, name="user_id_unique")],
    "profile_versions": [
        IndexModel(
            [("user_id", ASCENDING), ("version", ASCENDING)], unique=True, name="user_version"
        )
    ],
    "forms": [
        IndexModel(
            [("cycle_id", ASCENDING), ("course_id", ASCENDING), ("faculty_id", ASCENDING)],
            name="cycle_course_faculty",
        )
    ],
    "responses": [
        IndexModel(
            [("form_id", ASCENDING), ("student_hash", ASCENDING)],
            unique=True,
            name="one_response_per_student",
        )
    ],
    "analyses": [
        IndexModel(
            [("response_id", ASCENDING), ("model_version", ASCENDING)],
            unique=True,
            name="response_model_version",
        )
    ],
    "aggregates": [
        IndexModel(
            [("faculty_id", ASCENDING), ("course_id", ASCENDING), ("cycle_id", ASCENDING)],
            unique=True,
            name="faculty_course_cycle",
        )
    ],
    "moderation_queue": [IndexModel([("status", ASCENDING)], name="status")],
    "action_taken": [IndexModel([("cycle_id", ASCENDING)], name="cycle_id")],
    "labels": [
        IndexModel(
            [("response_id", ASCENDING), ("annotator_id", ASCENDING)],
            unique=True,
            name="response_annotator",
        )
    ],
    "audit_log": [IndexModel([("at", DESCENDING)], name="at_desc")],
}


def get_client() -> AsyncMongoClient:
    """Create the client on first use. The connection itself is lazy, so this never blocks."""
    global _client
    if _client is None:
        settings = get_settings()
        _client = AsyncMongoClient(
            settings.mongodb_uri,
            serverSelectionTimeoutMS=3000,
            tz_aware=True,
        )
    return _client


def get_db() -> AsyncDatabase:
    """FastAPI dependency returning the application database."""
    return get_client()[get_settings().mongodb_db]


async def ping() -> bool:
    try:
        await get_client().admin.command("ping")
    except Exception:
        return False
    return True


async def ensure_indexes(db: AsyncDatabase | None = None) -> dict[str, list[str]]:
    """Create every index in INDEXES (idempotent). Returns created index names per collection."""
    db = db if db is not None else get_db()
    created: dict[str, list[str]] = {}
    for name, models in INDEXES.items():
        created[name] = await db[name].create_indexes(models)
    return created


async def close_client() -> None:
    global _client
    if _client is not None:
        await _client.close()
        _client = None
