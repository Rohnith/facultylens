"""What faculty, their HoD and the IQAC admin may see about a faculty member's feedback.

Phase 3: response counts, and rating averages once a form has MIN_RESPONSES_FOR_DISPLAY
responses. Comment text stays hidden until Phase 4 has moderated and redacted it.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth.deps import Db, User, require_roles
from app.config import get_settings
from app.schemas.feedback import FormStats
from app.services.forms_data import course_brief, cycle_brief, lookups, response_counts
from app.utils import oid

router = APIRouter(prefix="/feedback", tags=["feedback"])
Staff = Annotated[User, Depends(require_roles("admin", "hod", "faculty"))]


@router.get("/faculty/{faculty_id}", response_model=list[FormStats])
async def faculty_feedback(
    faculty_id: str,
    db: Db,
    user: Staff,
    cycle: Annotated[str | None, Query()] = None,
    course: Annotated[str | None, Query()] = None,
) -> list[FormStats]:
    target = await db.users.find_one({"_id": oid(faculty_id, "Faculty member")})
    if not target or target["role"] not in ("faculty", "hod"):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Faculty member not found")
    allowed = (
        user["role"] == "admin"
        or user["_id"] == target["_id"]
        or (
            user["role"] == "hod"
            and target.get("department_id")
            and target.get("department_id") == user.get("department_id")
        )
    )
    if not allowed:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can't see this feedback.")

    query = {"faculty_id": target["_id"], "type": "teaching"}
    if cycle:
        query["cycle_id"] = oid(cycle, "Cycle")
    if course:
        query["course_id"] = oid(course, "Course")
    forms = await db.forms.find(query).to_list()
    cycles, courses, _ = await lookups(db, forms)
    counts = await response_counts(db, [f["_id"] for f in forms])
    minimum = get_settings().min_responses_for_display

    out = []
    for form in forms:
        n = counts.get(form["_id"], 0)
        visible = n >= minimum
        means = None
        if visible:
            pipeline = [
                {"$match": {"form_id": form["_id"]}},
                {
                    "$group": {
                        "_id": None,
                        **{
                            k["key"]: {"$avg": f"$likert.{k['key']}"}
                            for k in form["questions"]
                            if k["kind"] == "likert"
                        },
                    }
                },
            ]
            rows = [r async for r in await db.responses.aggregate(pipeline)]
            if rows:
                means = {k: round(v, 2) for k, v in rows[0].items() if k != "_id" and v is not None}
        course_doc = courses[form["course_id"]]
        out.append(
            FormStats(
                form_id=str(form["_id"]),
                cycle=cycle_brief(cycles[form["cycle_id"]]),
                course=course_brief(course_doc),
                responses=n,
                eligible=len(course_doc.get("student_ids", [])),
                min_required=minimum,
                visible=visible,
                likert_means=means,
                comments=[],
                comments_status="awaiting_analysis" if visible else "hidden_below_minimum",
            )
        )
    out.sort(key=lambda s: (s.cycle.closes_at, s.course.code, s.course.section), reverse=True)
    return out
