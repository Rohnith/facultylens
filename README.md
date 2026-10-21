# FacultyLens

**Faculty Profile Generation and Student Feedback Evaluation based on Text Summarization and Sentiment Analysis.** This is a B.Tech mini project (AI & NLP).

FacultyLens builds one page per faculty member. It joins an auto-generated profile with an analysis of anonymous student feedback: aspect-level sentiment with evidence, moderation and PII redaction, a bias & sarcasm panel, and a NAAC Criterion 1.4 report. Everything runs on a CPU.

Requirements: [`docs/SPEC.md`](docs/SPEC.md). Design system: [`docs/DESIGN.md`](docs/DESIGN.md). Measured model performance: [`docs/MODEL_CHECK.md`](docs/MODEL_CHECK.md).

> **Status: Phase 8 (evaluation).** Sign-in for all four roles, admin setup, faculty profiles with imports, anonymous feedback, the CPU NLP pipeline with moderation, grounded summaries, generated profiles, the unified faculty page, department insights, the bias & sarcasm panel and the NAAC Criterion 1.4 report all work. The evaluation module now has a labelling tool, Cohen's kappa, baselines against the transformer, moderation and PII checks, summary scoring and a faculty survey. The human-labelled results fill in as the team labels. Polish (Phase 9) comes next. Feature phases follow SPEC §14.

## Demo data

```bash
python -m app.seed
```

This fills an empty database with **synthetic** demo data set in **Maturi Venkata Subba Rao (MVSR) Engineering College**, Hyderabad:
- the college's 8 departments, from [mvsrec.in](https://mvsrec.in/departments.php); only CSE and ECE have demo staff, students and feedback;
- 11 semester-V offerings with real course codes and names from MVSR's R21 B.E. scheme (for example U21PCN05CS Automata Languages and Computation, U21PC502EC Digital Signal Processing);
- 11 teaching staff and 144 students, with roll numbers in the college's format (`2451-24-733-001`: college code, admission year, branch code, serial);
- an open "2026-27 Odd Sem" cycle with about 330 teaching and 290 syllabus responses.

**Every person is fictional.** No real MVSR teacher's name appears, so no invented feedback sits under a real name. The comments are hand-written sentence banks, not real student feedback. Every document is marked `is_synthetic` and is excluded from evaluation. All demo accounts use the password in `DEMO_PASSWORD` (`backend/.env.example`). Sign in as:
- admin: `iqac@demo.facultylens.in`
- HoD: `padma.rao@demo.facultylens.in`
- faculty: `kavitha.reddy@demo.facultylens.in`
- student: any roll number from `2451-24-733-001` (CSE) or `2451-24-735-001` (ECE).

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

## Feedback analysis

- New submissions are analysed in the background as they arrive (`ANALYSIS_ON_SUBMIT`). To analyse a whole cycle, sign in as admin, open **Analysis**, pick the cycle and press **Analyse waiting responses**. The first batch loads the models (about 45 s); after that, each response takes about 0.3–0.5 s.
- Results are cached per response and model version, so running again only scores new responses.
- `python -m app.pipeline.bench` times a full cycle and writes `backend/ml/results/pipeline_check.json`. Run it on a scratch copy (`MONGODB_DB=facultylens_bench`), because it writes analyses.
- Answers the abuse check hides wait in **Moderation**. Faculty never see them until an admin shows, edits or keeps them hidden. Names, phone numbers and roll numbers are replaced with placeholders before any model or person sees the text.
- Measured on the seeded cycle (`docs/MODEL_CHECK.md`):
  - 553 responses in 213.8 s from a cold start on a Ryzen 5 5600H with 4 threads; peak RAM 2.8 GB.
  - Every seeded phone number and roll number was redacted, and all 8 seeded abusive answers were hidden. The abuse check also hid 11 compliments containing the word "stupid" (precision 0.42).
  - The sarcasm flag caught all 22 seeded sarcastic answers, along with 15 sincere ones (precision 0.59).

## Summaries, generated profiles and the unified page

- **My page** (faculty and HoDs) puts the approved profile beside the feedback for one course at a time:
  - net sentiment and its split;
  - grounded strengths and areas to improve, where "Show the evidence" opens the redacted student answers with the supporting sentence marked;
  - every teaching aspect with its rating and whether ratings and comments agree;
  - the emotion mix, and the sarcasm and moderation counts.
- **Who sees what:** colleagues outside the department see only the approved profile. Feedback appears once a course has `MIN_RESPONSES_FOR_DISPLAY` responses.
- **Summaries** are written after each analysis run, and only when a course's data changed.
  - With `GROQ_API_KEY` set, Groq writes them. Every point must cite real evidence ids, or it is dropped.
  - Without a key, a built-in summary is made from the same statistics, plus an automatic digest by distilbart.
  - Adding a key later upgrades them on the next run, or press **Regenerate** via `POST /analysis/summaries`.
- **Generated profile** (My profile → Generated profile): a draft written only from the saved facts, with each claim checked against them. Without a key, or if a claim fails the check twice, a plain template is used. The faculty member edits it and approves it; only approved versions are shown to colleagues.

## Department insights and the bias & sarcasm panel

- **Department insights** (HoDs: their own department; IQAC admin: any department) show every teacher in a cycle in one sortable table: responses, net sentiment, rating, top strength and area to improve. Each name opens that teacher's page. Below it are the teaching aspects across the department.
- **The bias & sarcasm panel** looks for patterns in the feedback itself, by the gender the IQAC office recorded for each teacher, never shown next to a name. It shows:
  - how often comments use "ability" words (brilliant, genius…) and "warmth" words (helpful, caring…);
  - the rating gap per aspect, with a 95% interval in which each teacher counts once;
  - the emotion mix;
  - the possibly-sarcastic rate.
- **When it hides itself:** unless each group has at least `BIAS_MIN_GROUP_FACULTY` teachers (3) and `BIAS_MIN_GROUP_ANSWERS` answers (30), it shows only the group sizes. In the demo data, CSE (3 women, 3 men) shows the comparison and ECE (2 women, 3 men) does not.
- On the demo data every interval includes zero ("no clear difference"), even though some point gaps look large. With 3 teachers per group, individual teachers dominate; see `docs/MODEL_CHECK.md`. The API answers in under 35 ms at p95.

## NAAC report (Criterion 1.4)

1. As admin, open **NAAC report**, pick the cycle and press **Draft action items**. Each row is an issue for a whole department, such as "Pace & syllabus coverage was raised in 4 of 6 CSE courses", or a low-rated curriculum item. The suggested action comes from Groq if a key is set, otherwise from a fixed table.
2. Edit each action so the department will really do it, then approve it. HoDs can do the same for their department under **Department insights → Action taken**. Re-drafting never overwrites a row someone edited or approved.
3. **Preview PDF / Word** works at any time and is marked "DRAFT – not for submission" on every page. **Download PDF / Word** unlocks when every action is approved.

The report has these sections: the cover, feedback collection by department and course, methodology in plain words (including the models used), teaching analysis with charts and anonymised, redacted sample comments, curriculum feedback (1.4.1), the Action Taken Report, and the statement for the website (1.4.2) with signature lines. It is built for publication, so it reports departments and never names or scores an individual teacher.

## Evaluation

The full report is [`backend/ml/results/RESULTS.md`](backend/ml/results/RESULTS.md). The admin sees the same numbers on the **Evaluation** page.

**Data.** The evaluation uses no synthetic data. It uses:
- public student reviews: the RateMyProfessors sample by Jibo He (Mendeley Data, [DOI 10.17632/fvtfjyvw7d.2](https://data.mendeley.com/datasets/fvtfjyvw7d/2), CC BY 4.0);
- this college's real comments, once collected.

To set up the data:
1. Download `RateMyProfessor_Sample data.csv` from that page into `backend/ml/data/rmp/`. The folder is gitignored because the file contains real names.
2. Run:

```bash
python -m ml.import_items --rmp
```

The import keeps only each comment (redacted), the student's star rating and a one-way teacher key.

**Labelling.** On the **Users** page, the admin marks two staff accounts as *Annotator* and one as *Adjudicator*.
1. The annotators open **Labelling**. Each one labels the same 300 comments on their own: sentiment with keys 1–3, plus the aspects mentioned.
2. Each annotator also writes reference summaries for 20 teachers and checks the generated summaries against their evidence.
3. The adjudicator settles the disagreements.

Then run:

```bash
python -m ml.evaluate
```

Add `--finetune` to also fine-tune DistilBERT on the CPU, which took about 15 minutes here. Results go to `ml/results/`.

**Results so far.** These come from `ml/results/evaluation.json` (2026-10-21).
- **Sentiment, scored against each student's own star rating** (weak labels: 2,388 training and 611 test comments, split by teacher):

  | Model | Accuracy | Macro-F1 |
  |---|---:|---:|
  | VADER | 0.741 | 0.517 |
  | TF-IDF + Logistic Regression | 0.789 | **0.671** |
  | TF-IDF + Random Forest | 0.764 | 0.552 |
  | Twitter-RoBERTa (pretrained, zero-shot) | **0.815** | 0.647 |
  | DistilBERT (fine-tuned on CPU, 2 epochs) | 0.807 | 0.653 |

  The transformers are the most accurate, but the classical baseline trained on these reviews handles the *neutral* class better, so it has the best macro-F1. Every model is weak on neutral (F1 0.04–0.38). A star rating is a weak label for tone, so the human gold set will settle this.
- **Moderation and PII, on a hand-built set of 50 tricky sentences:**
  - Abuse: recall 1.00, precision 0.73. Four harsh but fair comments were hidden and wait for a person in the moderation queue.
  - Every phone number, roll number, email and link was redacted (recall 1.00).
- **Pending, until the team labels:** kappa, the human-gold sentiment and aspect scores, ROUGE/BERTScore against human references, the grounding rate, and the faculty survey. The report says *pending* for each; nothing is estimated.

## Repository layout

```
backend/   FastAPI app (app/), evaluation (ml/), tests
frontend/  React 18 + Vite + Tailwind v4
docs/      SPEC, DESIGN, MODEL_CHECK
postman/   API collection
```
