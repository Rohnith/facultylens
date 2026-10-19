"""Admin bootstrap: `python -m app.cli create-admin --email iqac@college.edu --name "IQAC Office"`.

Prints a temporary password once; the admin must change it at first sign-in."""

import argparse
import asyncio
import sys

from pydantic import TypeAdapter, ValidationError
from pydantic.networks import EmailStr

from app import db
from app.auth.security import generate_temp_password, hash_password
from app.services.audit import record
from app.utils import now


async def create_admin(email: str, name: str) -> int:
    try:
        email = TypeAdapter(EmailStr).validate_python(email).lower()
    except ValidationError:
        print(f"Not a valid email: {email}", file=sys.stderr)
        return 2
    if not await db.ping():
        print("MongoDB is not reachable at MONGODB_URI.", file=sys.stderr)
        return 1
    database = db.get_db()
    await db.ensure_indexes(database)
    if await database.users.find_one({"email": email}):
        print(f"A user with {email} already exists.", file=sys.stderr)
        return 1
    temp = generate_temp_password()
    doc = {
        "name": name.strip(),
        "role": "admin",
        "email": email,
        "password_hash": hash_password(temp),
        "must_change_pw": True,
        "is_active": True,
        "created_at": now(),
    }
    result = await database.users.insert_one(doc)
    await record(database, None, "user.create_admin_cli", str(result.inserted_id))
    print(f"Created admin {email}")
    print(f"Temporary password (shown once): {temp}")
    print("Sign in and change it straight away.")
    await db.close_client()
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    sub = parser.add_subparsers(dest="command", required=True)
    admin = sub.add_parser("create-admin", help="create an IQAC admin account")
    admin.add_argument("--email", required=True)
    admin.add_argument("--name", default="IQAC Coordinator")
    args = parser.parse_args()
    if args.command == "create-admin":
        sys.exit(asyncio.run(create_admin(args.email, args.name)))


if __name__ == "__main__":
    main()
