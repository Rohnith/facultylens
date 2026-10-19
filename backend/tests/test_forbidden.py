"""The SPEC "done when" check for Phase 1: every endpoint against every role.

Anonymous -> 401. A role outside the allowed set -> 403. An allowed role is never 401/403."""

import pytest

ROLES = ["anon", "admin", "hod", "faculty", "student"]
ANY = {"admin", "hod", "faculty", "student"}

# (method, path, allowed roles, json body). {course} / {user} are filled from the fixture.
ENDPOINTS = [
    ("GET", "/api/auth/me", ANY, None),
    ("GET", "/api/users", {"admin", "hod"}, None),
    ("POST", "/api/users", {"admin"}, {"name": "New Faculty", "role": "faculty"}),
    (
        "POST",
        "/api/users/bulk?dry_run=true",
        {"admin"},
        {"users": [{"name": "X", "role": "admin"}]},
    ),
    ("PATCH", "/api/users/{user}", {"admin"}, {"name": "Renamed Person"}),
    ("DELETE", "/api/users/{user}", {"admin"}, None),
    ("POST", "/api/users/{user}/reset-password", {"admin"}, None),
    ("GET", "/api/departments", ANY, None),
    ("POST", "/api/departments", {"admin"}, {"name": "Mechanical", "code": "MECH"}),
    ("PATCH", "/api/departments/{dept}", {"admin"}, {"name": "Computer Science and Engg"}),
    ("GET", "/api/courses", ANY, None),
    (
        "POST",
        "/api/courses",
        {"admin"},
        {
            "code": "CS502",
            "name": "Networks",
            "department_id": "{dept}",
            "academic_year": "2026-27",
            "semester": 5,
            "section": "B",
        },
    ),
    ("PATCH", "/api/courses/{course}", {"admin"}, {"name": "Compiler Design Lab"}),
    ("POST", "/api/courses/{course}/enrol", {"admin"}, {"add_roll_numbers": []}),
    ("GET", "/api/health/models", ANY | {"anon"}, None),
]

CASES = [
    pytest.param(method, path, allowed, body, role, id=f"{role}-{method}-{path}")
    for method, path, allowed, body in ENDPOINTS
    for role in ROLES
]


def _fill(value, ids):
    if isinstance(value, str):
        for key, v in ids.items():
            value = value.replace("{" + key + "}", v)
        return value
    if isinstance(value, dict):
        return {k: _fill(v, ids) for k, v in value.items()}
    return value


@pytest.mark.parametrize(("method", "path", "allowed", "body", "role"), CASES)
async def test_role_matrix(client, world, method, path, allowed, body, role):
    ids = {
        "course": str(world["course_id"]),
        "user": str(world["faculty"]["_id"]),
        "dept": str(world["cse"]),
    }
    r = await client.request(
        method, _fill(path, ids), json=_fill(body, ids), headers=world["headers"][role]
    )
    if role in allowed:
        assert r.status_code not in (401, 403), r.text
    elif role == "anon":
        assert r.status_code == 401, r.text
    else:
        assert r.status_code == 403, r.text
