import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { errorMessage } from "../../api/client";
import { profilesApi } from "../../api/profiles";
import { EvidenceDrawer } from "../../components/EvidenceDrawer";
import { FormError, Select } from "../../components/forms";
import { RateBar } from "../../components/RateBar";
import { useAuth } from "../../context/auth";
import { Aspects, Footer, Overall, Summary } from "./Insights";
import { ProfileColumn } from "./ProfileColumn";

function Pickers({ data, selected, onPick }) {
  const cycle = data.cycles.find((c) => c.id === selected.cycle.id) ?? data.cycles[0];
  return (
    <div className="card flex flex-col gap-4 p-[var(--card-pad)] md:flex-row md:items-end">
      <label className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="text-small text-muted">Cycle</span>
        <Select
          value={cycle.id}
          onChange={(e) => onPick({ cycle: e.target.value })}
          disabled={data.cycles.length < 2}
        >
          {data.cycles.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.status === "open" ? " (open)" : ""}
            </option>
          ))}
        </Select>
      </label>
      <label className="flex min-w-0 flex-[1.4] flex-col gap-1.5">
        <span className="text-small text-muted">Course</span>
        <Select
          value={selected.course.id}
          onChange={(e) => onPick({ cycle: cycle.id, course: e.target.value })}
          disabled={cycle.offerings.length < 2}
        >
          {cycle.offerings.map((o) => (
            <option key={o.id} value={o.id}>
              {o.code} · {o.name} · Section {o.section}
            </option>
          ))}
        </Select>
      </label>
      <div className="min-w-0 flex-1">
        <RateBar value={selected.responses} total={selected.eligible} />
      </div>
    </div>
  );
}

function Notice({ title, children }) {
  return (
    <section className="card flex flex-col gap-1 p-[var(--card-pad)]">
      <h2 className="m-0 text-section font-medium">{title}</h2>
      <p className="m-0 max-w-[68ch] text-body text-muted">{children}</p>
    </section>
  );
}

function Feedback({ data, onPick, onEvidence }) {
  const sel = data.selected;
  if (!sel) {
    return (
      <Notice title="No feedback yet">
        Feedback appears here once a cycle with a teaching form for one of these courses opens.
      </Notice>
    );
  }
  return (
    <div className="flex flex-col gap-[var(--gap)]">
      <Pickers data={data} selected={sel} onPick={onPick} />
      {sel.status === "below_minimum" && (
        <Notice title="Not enough responses yet">
          Feedback is shown once at least {sel.min_required} students respond, so no one can be
          identified. {sel.responses} {sel.responses === 1 ? "has" : "have"} responded so far.
        </Notice>
      )}
      {sel.status === "awaiting_analysis" && (
        <Notice title="Waiting for analysis">
          The {sel.responses} responses are in, but the comments haven&apos;t been analysed and
          moderated yet. This page fills in after the next analysis run.
        </Notice>
      )}
      {sel.status === "available" && (
        <>
          <Overall insights={sel.insights} />
          <Summary
            summary={sel.summary}
            aspects={sel.insights.aspects}
            onEvidence={(event, item, kind) =>
              onEvidence(event, {
                ids: item.evidence_ids,
                tone: kind === "strength" ? "positive" : "negative",
                kicker: `${kind === "strength" ? "Strength" : "Area to improve"} · ${item.aspectLabel}`,
                title: item.text,
              })
            }
          />
          <Aspects insights={sel.insights} />
          <Footer
            insights={sel.insights}
            sarcasticCount={sel.sarcastic_ids.length}
            onSarcasm={(event) =>
              onEvidence(event, {
                ids: sel.sarcastic_ids.slice(0, 40),
                tone: "neutral",
                kicker: `${sel.course.code} · Section ${sel.course.section}`,
                title: "Answers that may be sarcastic",
              })
            }
          />
        </>
      )}
    </div>
  );
}

/**
 * The unified faculty page (SPEC §11.4): the approved profile beside what students said.
 * Staff outside the person's department see the profile only.
 */
export function FacultyPage() {
  const { facultyId: routeId } = useParams();
  const { user: me } = useAuth();
  const facultyId = routeId ?? me.id;
  const [params, setParams] = useState({});
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [drawer, setDrawer] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    // Load whenever the person, the chosen cycle/course, or Retry changes.
    let alive = true;
    profilesApi
      .overview(facultyId, params)
      .then((d) => {
        if (!alive) return;
        setData(d);
        setError(null);
      })
      .catch((err) => alive && setError(errorMessage(err, "Couldn't load this page.")));
    return () => {
      alive = false;
    };
  }, [facultyId, params, reload]);

  const reviewLink = routeId ? `/admin/faculty/${facultyId}/profile/review` : "/profile/review";

  return (
    <div className="mx-auto flex max-w-[1184px] flex-col gap-6">
      {error && (
        <div className="flex flex-wrap items-center gap-3">
          <FormError>{error}</FormError>
          <button
            type="button"
            className="btn btn-ghost h-8 px-2"
            onClick={() => setReload((n) => n + 1)}
          >
            Retry
          </button>
        </div>
      )}
      {!data && !error && (
        <div
          className="grid items-start gap-[var(--gap)] lg:grid-cols-[360px_minmax(0,1fr)]"
          aria-busy="true"
        >
          <span className="skeleton h-[480px] w-full" />
          <div className="flex flex-col gap-[var(--gap)]">
            <span className="skeleton h-24 w-full" />
            <span className="skeleton h-40 w-full" />
            <span className="skeleton h-72 w-full" />
          </div>
        </div>
      )}
      {data && (
        <div className="grid items-start gap-[var(--gap)] lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-6">
            <ProfileColumn profile={data.profile} isOwner={data.is_owner} reviewLink={reviewLink} />
          </div>
          {data.feedback_access ? (
            <Feedback
              data={data}
              onPick={(p) => setParams(p)}
              onEvidence={(_event, request) => setDrawer(request)}
            />
          ) : (
            <Notice title="Student feedback is private">
              Only {data.profile.name}, their head of department and the IQAC team can see feedback.{" "}
              <Link to="/" className="font-medium text-text">
                Back to your courses
              </Link>
            </Notice>
          )}
        </div>
      )}
      <EvidenceDrawer facultyId={facultyId} request={drawer} onClose={() => setDrawer(null)} />
    </div>
  );
}
