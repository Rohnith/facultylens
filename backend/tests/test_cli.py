from app import cli, db
from app.auth.security import verify_password


async def _keep_client():
    return None  # the test's own client must stay open for the fixture's cleanup


async def test_create_admin_prints_a_one_time_password(mongo, monkeypatch, capsys):
    monkeypatch.setattr(db, "close_client", _keep_client)
    assert await cli.create_admin("IQAC@College.edu", " IQAC Office ") == 0
    out = capsys.readouterr().out
    temp = out.split("(shown once): ")[1].splitlines()[0]
    user = await mongo.users.find_one({"email": "iqac@college.edu"})
    assert user["role"] == "admin" and user["must_change_pw"] and user["name"] == "IQAC Office"
    assert verify_password(temp, user["password_hash"])
    assert await mongo.audit_log.find_one({"action": "user.create_admin_cli"})

    assert await cli.create_admin("iqac@college.edu", "Again") == 1  # no duplicates
    assert "already exists" in capsys.readouterr().err
    assert await cli.create_admin("not-an-email", "X") == 2
    assert await mongo.users.count_documents({}) == 1
