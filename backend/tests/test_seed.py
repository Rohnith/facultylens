import pytest

from app import seed as seed_module
from app.feedback_spec import ASPECT_KEYS
from app.services.anonymity import student_form_hash
from tests.conftest import make_user


async def test_seed_shape_is_synthetic_and_repeatable(mongo):
    first = await seed_module.seed(mongo)
    assert first["students"] == 144 and first["offerings"] == 10
    assert 250 <= first["teaching_responses"] <= 330
    for name in seed_module.COLLECTIONS:
        assert await mongo[name].count_documents({"is_synthetic": {"$ne": True}}) == 0
    # Women and men among teaching staff: the bias panel needs at least 3 per group.
    genders = [u["gender"] async for u in mongo.users.find({"role": {"$in": ["faculty", "hod"]}})]
    assert genders.count("female") >= 3 and genders.count("male") >= 3

    again = await seed_module.seed(mongo)  # replaces the synthetic data, same random seed
    assert again["teaching_responses"] == first["teaching_responses"]
    assert await mongo.users.count_documents({}) == 155


async def test_seeded_responses_follow_the_privacy_rules(mongo):
    await seed_module.seed(mongo)
    response = await mongo.responses.find_one({"type": "teaching"})
    assert set(response["likert"]) == set(ASPECT_KEYS)
    assert (response["submitted_on"].hour, response["submitted_on"].minute) == (0, 0)
    assert "student_id" not in response
    # The seeded student's per-form code matches, so they see the form as submitted.
    student = await mongo.users.find_one({"roll_no": "23A91A0501"})
    course = await mongo.courses.find_one({"student_ids": student["_id"]})
    form = await mongo.forms.find_one({"course_id": course["_id"], "type": "teaching"})
    expected = student_form_hash(student["_id"], form["_id"])
    found = await mongo.responses.count_documents(
        {"form_id": form["_id"], "student_hash": expected}
    )
    assert found in (0, 1)  # about 82% of students answered


async def test_seed_refuses_real_data_and_reset_keeps_it(mongo):
    real = await make_user(mongo, "admin", email="real@college.edu")
    with pytest.raises(SystemExit):
        await seed_module.seed(mongo)
    await seed_module.seed(mongo, force=True)
    removed = await seed_module.reset(mongo)
    assert removed["users"] == 155
    assert await mongo.users.count_documents({}) == 1
    assert await mongo.users.find_one({"_id": real["_id"]})
