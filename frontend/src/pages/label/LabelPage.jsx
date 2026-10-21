import { useState } from "react";
import { useSearchParams } from "react-router";
import { errorMessage } from "../../api/client";
import { labelsApi } from "../../api/evaluation";
import { FormError } from "../../components/forms";
import { PageHeader } from "../../components/PageHeader";
import { RateBar } from "../../components/RateBar";
import { useAuth } from "../../context/auth";
import { GroundingTab, ReferenceTab } from "./GroupTabs";
import { SKIP_REASONS, aspectList, emptyJudgement } from "../../lib/labels";
import { LabelForm } from "./LabelForm";
import { ResolveTab } from "./ResolveTab";
import { useAsync } from "../../hooks/useAsync";
import { Failed } from "./shared";

function LabelTab() {
  const next = useAsync(labelsApi.next);
  const [value, setValue] = useState(emptyJudgement);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [skipping, setSkipping] = useState(false);
  const item = next.data?.item;
  const progress = next.data?.progress;

  async function save(extra) {
    setBusy(true);
    setError(null);
    try {
      await labelsApi.save({
        item_id: item.id,
        sentiment: extra?.skip_reason ? null : value.sentiment,
        aspects: extra?.skip_reason ? [] : aspectList(value.aspects),
        sarcastic: value.sarcastic,
        ...extra,
      });
      setValue(emptyJudgement());
      setSkipping(false);
      next.reload();
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(errorMessage(err, "Couldn't save the label."));
    } finally {
      setBusy(false);
    }
  }

  if (next.error) return <Failed error={next.error} onRetry={next.reload} />;
  if (!next.data) return <span className="skeleton h-80 w-full" aria-busy="true" />;
  if (!item)
    return (
      <div className="flex flex-col gap-3">
        <RateBar value={progress.mine} total={progress.total} label="labelled" />
        <p className="m-0 text-body">
          {progress.total
            ? "You've labelled every comment in the set. Thank you."
            : "There's nothing to label yet. The IQAC admin imports the comments first."}
        </p>
      </div>
    );

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.sentiment && !busy) save();
      }}
    >
      <RateBar value={progress.mine} total={progress.total} label="labelled" />
      <figure className="m-0 flex flex-col gap-2 rounded-card border border-border bg-raised p-5">
        <figcaption className="text-small text-muted">
          {item.source === "app"
            ? "Student comment (this college)"
            : "Student comment (public dataset)"}
        </figcaption>
        <blockquote className="m-0 max-w-[72ch] text-section leading-7 whitespace-pre-line">
          {item.text}
        </blockquote>
      </figure>
      <LabelForm key={item.id} value={value} onChange={setValue} idPrefix="label" />
      {error && <FormError>{error}</FormError>}
      <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-4">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!value.sentiment || busy || next.refreshing}
        >
          {busy ? "Saving…" : "Save and next"}
        </button>
        {!skipping ? (
          <button type="button" className="btn btn-ghost" onClick={() => setSkipping(true)}>
            Skip this comment…
          </button>
        ) : (
          <div role="group" aria-label="Why skip it?" className="flex flex-wrap items-center gap-2">
            <span className="text-small text-muted">Why skip it?</span>
            {SKIP_REASONS.map(([reason, label]) => (
              <button
                key={reason}
                type="button"
                className="btn btn-secondary h-8 px-3 text-small"
                disabled={busy}
                onClick={() => save({ skip_reason: reason })}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              className="btn btn-ghost h-8 px-2 text-small"
              onClick={() => setSkipping(false)}
            >
              Cancel
            </button>
          </div>
        )}
        <span className="text-small text-muted max-sm:w-full sm:ml-auto">
          Keys 1, 2, 3 choose the sentiment; Enter saves.
        </span>
      </div>
    </form>
  );
}

const TABS = {
  annotator: [
    ["label", "Label comments"],
    ["reference", "Write reference summaries"],
    ["grounding", "Check summaries"],
  ],
  adjudicator: [
    ["resolve", "Settle disagreements"],
    ["reference", "Write reference summaries"],
    ["grounding", "Check summaries"],
  ],
};

export function LabelPage() {
  const { user } = useAuth();
  const tabs = TABS[user.annotator] ?? [];
  const [params, setParams] = useSearchParams();
  const tab = tabs.some(([key]) => key === params.get("tab")) ? params.get("tab") : tabs[0]?.[0];

  return (
    <div className="mx-auto flex max-w-[1184px] flex-col gap-8">
      <PageHeader title="Labelling">
        {user.annotator === "adjudicator"
          ? "You settle the comments the two annotators labelled differently. Your decision becomes the gold label the models are scored against."
          : "Label each comment on your own, without discussing it: the evaluation compares your labels with a second annotator's. Students' names and numbers are already removed."}
      </PageHeader>
      <section className="card" aria-label="Labelling tasks">
        <div className="border-b border-rule px-[var(--card-pad)]">
          <div role="tablist" aria-label="Tasks" className="-mb-px flex gap-5 overflow-x-auto">
            {tabs.map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                className={`h-11 cursor-pointer border-b-2 text-body whitespace-nowrap transition-colors ${
                  tab === key
                    ? "border-text font-medium text-text"
                    : "border-transparent text-muted hover:text-text"
                }`}
                onClick={() => setParams({ tab: key }, { replace: true })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div role="tabpanel" className="p-[var(--card-pad)]">
          {tab === "label" && <LabelTab />}
          {tab === "resolve" && <ResolveTab />}
          {tab === "reference" && <ReferenceTab />}
          {tab === "grounding" && <GroundingTab />}
        </div>
      </section>
    </div>
  );
}
