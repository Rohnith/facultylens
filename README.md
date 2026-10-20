# FacultyLens

**Faculty Profile Generation and Student Feedback Evaluation based on Text Summarization and Sentiment Analysis.** This is a B.Tech mini project (AI & NLP).

FacultyLens builds one page per faculty member. It joins an auto-generated profile with an analysis of anonymous student feedback: aspect-level sentiment with evidence, moderation and PII redaction, a bias & sarcasm panel, and a NAAC Criterion 1.4 report. Everything runs on a CPU.

Requirements: [`docs/SPEC.md`](docs/SPEC.md). Design system: [`docs/DESIGN.md`](docs/DESIGN.md). Measured model performance: [`docs/MODEL_CHECK.md`](docs/MODEL_CHECK.md).

> **Status: Phase 3 (feedback collection).** Sign-in for all four roles, admin setup, faculty profiles with ORCID / Semantic Scholar import, feedback cycles, and anonymous once-only student feedback work. The NLP analysis comes next. Feature phases follow SPEC §14.

## Demo data

```bash
python -m app.seed
```

This fills an empty database with **synthetic** demo data:
- 2 departments, 10 teaching staff, 144 students and 10 course offerings;
- an open "2026-27 Odd Sem" cycle with about 290 teaching and 260 syllabus responses.

Every document is marked `is_synthetic` and is excluded from evaluation. All demo accounts use the password in `DEMO_PASSWORD` (`backend/.env.example`). Sign in as:
- admin: `iqac@demo.facultylens.in`
- HoD: `padma.rao@demo.facultylens.in`
- faculty: `kavitha.reddy@demo.facultylens.in`
- student: any roll number from `23A91A0501`.

`python -m app.seed --reset` removes only the synthetic data. The seed refuses to run on a database that already has real users.

## Prerequisites

- Python 3.13, Node 22+ (developed on Node 24)
- MongoDB Community Server running on `127.0.0.1:27017`. Use `127.0.0.1`, not `localhost`; a default local install listens on IPv4 only.
- About 4 GB of free disk for the light-mode models. No GPU is needed.

## Backend setup

On Windows PowerShell, run each command on its own line (`&&` does not work in PowerShell 5.1).

```bash
cd backend
```

```bash
py -3.13 -m venv .venv
```

Activate the venv: Windows `.venv\Scripts\activate`, Mac/Linux `source .venv/bin/activate`. Then:

```bash
pip install torch --index-url https://download.pytorch.org/whl/cpu
```

```bash
pip install -r requirements-dev.txt
```

```bash
python -m spacy download en_core_web_sm
```

Copy `.env.example` to `.env` and set `JWT_SECRET` and `STUDENT_HASH_SALT` to long random strings. `GROQ_API_KEY` is optional; without it the app uses its no-LLM fallback.

Download the models once (about 4 GB, cached in `backend/.hf_cache`):

```bash
python -m app.nlp.registry --download
```

Measure every model on this machine (writes `docs/MODEL_CHECK.md`):

```bash
python -m app.nlp.registry --check
```

Create the first IQAC admin (prints a temporary password once; change it at first sign-in):

```bash
python -m app.cli create-admin --email iqac@yourcollege.ac.in --name "IQAC Coordinator"
```

Run the API (docs at http://127.0.0.1:8000/docs):

```bash
uvicorn app.main:app --reload --port 8000
```

Tests and lint:

```bash
pytest -q
```

```bash
pytest -m slow
```

```bash
ruff check .
```

`pytest -m network` imports two real public ORCID records (ORCID's test record 0000-0002-1825-0097 and Yoshua Bengio, 0000-0002-9322-3515); it needs internet.

The fast suite needs MongoDB running: it uses a separate `facultylens_test` database and drops it afterwards. It includes a role matrix that calls every endpoint as each role and checks the 401/403 answers. `-m slow` loads every real model.

## Frontend setup

```bash
cd frontend
```

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:5173. The dev server proxies `/api` to `127.0.0.1:8000`. Run `npm run lint` and `npm run build` to check the code.

## Signing in

- Staff sign in with their college email; students with their roll number (`ROLL_NO_REGEX` in `.env`).
- Accounts made by the admin (one at a time or by CSV on the Users page) get a temporary password, shown once with a CSV download. Everyone must replace it at first sign-in.
- The refresh token is an httpOnly cookie on `/api/auth`; the access token lives only in memory.

## Profile imports

- Faculty open **My profile** and import from **ORCID** (paste the iD or orcid.org link) or **Semantic Scholar** (search your name, then pick the right author).
- Everything imported waits for review. Nothing reaches the profile until the faculty member accepts it, and rejected items aren't suggested again.
- Semantic Scholar's shared rate limit is low. If imports say "limiting requests", wait a minute, or put a free key in `S2_API_KEY` in `backend/.env`.

## Repository layout

```
backend/   FastAPI app (app/), evaluation (ml/), tests
frontend/  React 18 + Vite + Tailwind v4
docs/      SPEC, DESIGN, MODEL_CHECK
postman/   API collection
```
