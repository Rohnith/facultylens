import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { errorMessage } from "../../api/client";
import { feedbackApi, formatDate } from "../../api/feedback";
import { FormError, TextArea } from "../../components/forms";
import { LikertScale } from "../../components/LikertScale";

const MAX = 2000;

function TextQuestion({ id, label, value, onChange }) {
  const count = value.length;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-body font-medium">
        {label} <span className="font-normal text-muted">(optional)</span>
      </label>
      <TextArea
        id={id}
        value={value}
        maxLength={MAX}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={`${id}-count`}
      />
      <span
        id={`${id}-count`}
        className={`num self-end text-small ${count > MAX - 100 ? "text-warning" : "text-muted"}`}
      >
        {count.toLocaleString("en-IN")} / {MAX.toLocaleString("en-IN")}
      </span>
    </div>
  );
}

function ThankYou({ form }) {
  const [next, setNext] = useState(undefined);
  useEffect(() => {
    let alive = true;
    feedbackApi
      .myForms()
      .then((all) => alive && setNext(all.find((f) => !f.submitted && f.id !== form.id) ?? null))
      .catch(() => alive && setNext(null));
    return () => {
      alive = false;
    };
  }, [form.id]);
  const heading = useRef(null);
  useEffect(() => heading.current?.focus(), []);

  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-4 pt-8">
      <h1 ref={heading} tabIndex={-1} className="m-0 font-marker text-marker outline-none">
        Thank you. Your feedback was recorded.
      </h1>
      <p className="m-0 text-body text-muted">
        It was saved without your name or roll number, so{" "}
        {form.faculty ? form.faculty.name : "your teachers"} will never know it was you. Comments
        are checked for abusive language and personal details before any teacher reads them.
      </p>
      <div className="flex flex-wrap gap-2 pt-2">
        {next && (
          <Link to={`/feedback/${next.id}`} className="btn btn-primary no-underline">
            Next form: {next.course.code}{" "}
            {next.type === "teaching" ? `· ${next.faculty?.name}` : "· syllabus"}
          </Link>
        )}
        <Link to="/" className={`btn ${next ? "btn-ghost" : "btn-primary"} no-underline`}>
          All my forms
        </Link>
      </div>
    </div>
  );
}

export function FeedbackFormPage() {
  const { formId } = useParams();
  const [form, setForm] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [ratings, setRatings] = useState({});
  const [texts, setTexts] = useState({});
  const [tried, setTried] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let alive = true;
    feedbackApi
      .form(formId)
      .then((f) => alive && setForm(f))
      .catch((err) => alive && setLoadError(errorMessage(err)));
    return () => {
      alive = false;
    };
  }, [formId]);

  const likert = form?.questions.filter((q) => q.kind === "likert") ?? [];
  const textQs = form?.questions.filter((q) => q.kind === "text") ?? [];
  const missing = likert.filter((q) => !ratings[q.key]);
  const started = Object.keys(ratings).length > 0 || Object.values(texts).some(Boolean);

  useEffect(() => {
    if (!started || done) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [started, done]);

  async function submit(event) {
    event.preventDefault();
    setTried(true);
    setError(null);
    if (missing.length) {
      document.getElementById(`q-${missing[0].key}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      await feedbackApi.submit(formId, { likert: ratings, texts });
      setDone(true);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(errorMessage(err, "Couldn't send your feedback. Try again."));
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto flex max-w-[640px] flex-col gap-3">
        <h1 className="m-0 font-marker text-marker">Feedback form</h1>
        <FormError>{loadError}</FormError>
        <Link to="/" className="text-body text-muted">
          ← All my forms
        </Link>
      </div>
    );
  }
  if (!form) {
    return (
      <div className="mx-auto flex max-w-[880px] flex-col gap-6" aria-busy="true">
        <span className="skeleton h-8 w-72" />
        <span className="skeleton h-64 w-full" />
      </div>
    );
  }
  if (done) return <ThankYou form={form} />;

  const course = form.course;
  const closed = form.cycle.status !== "open";

  return (
    <div className="mx-auto flex max-w-[880px] flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Link to="/" className="w-fit text-body text-muted hover:text-text">
          ← All my forms
        </Link>
        <header className="flex flex-col gap-2">
          <h1 className="m-0 font-marker text-marker">
            {course.code} · {course.name}
          </h1>
          <p className="m-0 text-body text-muted">
            {form.type === "teaching"
              ? `Teaching feedback for ${form.faculty?.name}`
              : "Feedback on the course and syllabus"}
            {" · "}
            {form.cycle.name} · open until {formatDate(form.cycle.closes_at)}
          </p>
          <p className="m-0 max-w-[68ch] text-body">
            Anonymous: your answers are stored without your name or roll number, and a one-way code
            only stops a second submission. Be honest and specific; it is the most useful thing you
            can give.
          </p>
        </header>
      </div>

      {form.submitted ? (
        <p className="card m-0 flex items-center gap-3 p-[var(--card-pad)] text-body">
          <span className="pill pill-positive">Submitted</span>
          You&apos;ve already given feedback on this form. Each form can be answered once.
        </p>
      ) : closed ? (
        <p className="card m-0 p-[var(--card-pad)] text-body text-muted">
          This feedback cycle is closed.
        </p>
      ) : (
        <form onSubmit={submit} noValidate className="flex flex-col gap-[var(--gap)]">
          <section className="card" aria-labelledby="ratings-h">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule px-[var(--card-pad)] py-3">
              <h2 id="ratings-h" className="m-0 text-section font-medium">
                Ratings
              </h2>
              <span className="num text-small text-muted" aria-live="polite">
                {likert.length - missing.length} of {likert.length} rated
              </span>
            </div>
            <div className="flex flex-col divide-y divide-rule">
              {likert.map((q) => (
                <div key={q.key} className="px-[var(--card-pad)] py-4">
                  <LikertScale
                    id={`q-${q.key}`}
                    name={q.key}
                    label={q.label}
                    question={q.text}
                    value={ratings[q.key]}
                    invalid={tried && !ratings[q.key]}
                    onChange={(v) => setRatings((r) => ({ ...r, [q.key]: v }))}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="card" aria-labelledby="comments-h">
            <div className="border-b border-rule px-[var(--card-pad)] py-3">
              <h2 id="comments-h" className="m-0 text-section font-medium">
                In your own words
              </h2>
              <p className="m-0 text-small text-muted">
                Avoid names and phone numbers; they are removed before teachers read comments.
              </p>
            </div>
            <div className="flex flex-col gap-5 p-[var(--card-pad)]">
              {textQs.map((q) => (
                <TextQuestion
                  key={q.key}
                  id={`t-${q.key}`}
                  label={q.text}
                  value={texts[q.key] ?? ""}
                  onChange={(v) => setTexts((t) => ({ ...t, [q.key]: v }))}
                />
              ))}
            </div>
          </section>

          <div className="flex flex-col gap-3 pb-8">
            {tried && missing.length > 0 && (
              <div className="flex flex-col gap-1 text-body" role="alert">
                <span>
                  {missing.length === 1 ? "One rating is" : `${missing.length} ratings are`}{" "}
                  missing:
                </span>
                <ul className="m-0 flex flex-wrap gap-x-3 gap-y-1 p-0 text-small">
                  {missing.map((q) => (
                    <li key={q.key} className="list-none">
                      <a
                        href={`#q-${q.key}`}
                        className="text-negative underline"
                        onClick={(e) => {
                          e.preventDefault();
                          document.getElementById(`q-${q.key}`)?.focus();
                          document
                            .getElementById(`q-${q.key}`)
                            ?.scrollIntoView({ block: "center" });
                        }}
                      >
                        {q.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <FormError>{error}</FormError>
            <div>
              <button type="submit" className="btn btn-primary h-11 px-6" disabled={busy}>
                {busy ? "Sending…" : "Submit feedback"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
