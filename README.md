# FacultyLens

**Faculty Profile Generation and Student Feedback Evaluation based on Text Summarization and Sentiment Analysis.** This is a B.Tech mini project (AI & NLP).

FacultyLens builds one page per faculty member. It joins an auto-generated profile with an analysis of anonymous student feedback: aspect-level sentiment with evidence, moderation and PII redaction, a bias & sarcasm panel, and a NAAC Criterion 1.4 report. Everything runs on a CPU.

Requirements: [`docs/SPEC.md`](docs/SPEC.md). Design system: [`docs/DESIGN.md`](docs/DESIGN.md). Measured model performance: [`docs/MODEL_CHECK.md`](docs/MODEL_CHECK.md).

> **Status: Phase 0 (scaffold).** The API health checks, the model registry and the frontend shell work. Feature phases follow SPEC §14.

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

The fast suite needs MongoDB for one live test (it uses a separate `facultylens_test` database and drops it afterwards). `-m slow` loads every real model.

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

## Repository layout

```
backend/   FastAPI app (app/), evaluation (ml/), tests
frontend/  React 18 + Vite + Tailwind v4
docs/      SPEC, DESIGN, MODEL_CHECK
postman/   API collection
```
