import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { errorMessage } from "../api/client";
import { Field, FormError, TextInput } from "../components/forms";
import { StandaloneLayout } from "../components/StandaloneLayout";
import { useAuth } from "../context/auth";

const FACTS = [
  {
    title: "Student feedback is anonymous",
    body: "Teachers never see who wrote a comment. The system keeps only a one-way code to check that each student submits a form once.",
  },
  {
    title: "Comments are screened before anyone reads them",
    body: "Abusive language is held back for the IQAC coordinator, and names, phone numbers and roll numbers are removed from the text teachers see.",
  },
  {
    title: "Small classes stay private",
    body: "Comment-level detail appears only once a course has enough responses that no single student can be picked out.",
  },
  {
    title: "Faculty approve their own profile",
    body: "Profiles are written from each teacher's own records and stay hidden until the teacher reviews and approves them.",
  },
];

function HowItWorks() {
  return (
    <section aria-labelledby="how-h" className="flex flex-col gap-6">
      <h2 id="how-h" className="m-0 text-section font-medium">
        How FacultyLens treats feedback
      </h2>
      <dl className="m-0 grid gap-x-10 gap-y-6 sm:grid-cols-2">
        {FACTS.map((f) => (
          <div key={f.title} className="flex flex-col gap-1.5">
            <dt className="text-body font-medium">{f.title}</dt>
            <dd className="m-0 text-body text-muted">{f.body}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function LoginPage() {
  const { status, user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (status === "signedIn") {
    return <Navigate to={user.must_change_pw ? "/change-password" : "/"} replace />;
  }

  async function submit(event) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const signedIn = await login(form.username.trim(), form.password);
      const from = location.state?.from;
      navigate(signedIn.must_change_pw ? "/change-password" : from || "/", { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Couldn't sign in. Try again."));
      setForm((f) => ({ ...f, password: "" }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <StandaloneLayout aside={<HowItWorks />}>
      <h1 className="m-0 font-marker text-marker">Sign in</h1>
      <p className="mt-2 mb-8 text-body text-muted">
        Staff use their college email. Students use their roll number.
      </p>
      <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
        <Field label="Email or roll number">
          {(a11y) => (
            <TextInput
              {...a11y}
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          )}
        </Field>
        <Field label="Password">
          {(a11y) => (
            <TextInput
              {...a11y}
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          )}
        </Field>
        <FormError>{error}</FormError>
        <button
          type="submit"
          className="btn btn-primary h-10 w-full"
          disabled={busy || !form.username.trim() || !form.password}
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="m-0 text-small text-muted">
          Forgot your password? Ask your IQAC coordinator to reset it.
        </p>
      </form>
    </StandaloneLayout>
  );
}
