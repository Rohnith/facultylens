"""Shared lookups for cycles, forms and responses (kept out of the routers to avoid repetition)."""

from typing import Any

from bson import ObjectId
from pymongo.asynchronous.database import AsyncDatabase


def cycle_brief(cycle: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(cycle["_id"]),
        "name": cycle["name"],
        "status": cycle["status"],
        "closes_at": cycle["closes_at"],
    }


def course_brief(course: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(course["_id"]),
        "code": course["code"],
        "name": course["name"],
        "academic_year": course["academic_year"],
        "semester": course["semester"],
        "section": course["section"],
        "department_id": str(course["department_id"]),
    }


async def lookups(
    db: AsyncDatabase, forms: list[dict[str, Any]]
) -> tuple[dict[ObjectId, dict], dict[ObjectId, dict], dict[ObjectId, dict]]:
    """Cycles, courses and teachers referenced by a list of forms, each keyed by _id."""
    cycle_ids = list({f["cycle_id"] for f in forms})
    course_ids = list({f["course_id"] for f in forms})
    faculty_ids = list({f["faculty_id"] for f in forms if f.get("faculty_id")})
    cycles = {c["_id"]: c async for c in db.feedback_cycles.find({"_id": {"$in": cycle_ids}})}
    courses = {c["_id"]: c async for c in db.courses.find({"_id": {"$in": course_ids}})}
    people = {u["_id"]: u async for u in db.users.find({"_id": {"$in": faculty_ids}}, {"name": 1})}
    return cycles, courses, people


async def response_counts(db: AsyncDatabase, form_ids: list[ObjectId]) -> dict[ObjectId, int]:
    pipeline = [
        {"$match": {"form_id": {"$in": form_ids}}},
        {"$group": {"_id": "$form_id", "n": {"$sum": 1}}},
    ]
    return {row["_id"]: row["n"] async for row in await db.responses.aggregate(pipeline)}
