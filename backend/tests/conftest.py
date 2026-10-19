import os

import pytest

# Tests use their own database so they never touch demo data.
os.environ["MONGODB_DB"] = "facultylens_test"

from app import db  # noqa: E402
from app.config import get_settings  # noqa: E402


@pytest.fixture(autouse=True)
def _fresh_settings():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
async def mongo():
    """Live local MongoDB test database; skipped if the server isn't running."""
    await db.close_client()
    if not await db.ping():
        pytest.skip("MongoDB not reachable on MONGODB_URI")
    database = db.get_db()
    yield database
    await db.get_client().drop_database(database.name)
    await db.close_client()
