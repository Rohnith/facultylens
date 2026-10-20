"""Grounded strengths / improvements for one teaching form (SPEC §5 "Summaries").

Input is the form's aggregate only: aspect statistics plus at most 40 evidence sentences that
are already moderated and redacted, each with its id. The LLM sees nothing else, and every item
it returns must cite evidence ids from that set or it is dropped. Without an LLM (no key, Groq
down, or nothing valid came back) a deterministic summary is built from the same statistics,
so it is grounded by construction; distilbart only writes the optional digest of comments.
"""

import json
import logging
from typing import Any

from pydantic import BaseModel, Field

from app.feedback_spec import ASPECT_KEYS, ASPECT_LABELS, SUGGESTED_ACTIONS
from app.nlp import llm

log = logging.getLogger("facultylens.summaries")

MAX_EVIDENCE = 40
MAX_ITEMS = 4
MIN_MENTIONS = 2  # an aspect needs at least this many mentions to be called a strength or gap


# --------------------------------------------------------------------------- LLM output schema


class _Item(BaseModel):
    text: str = Field(min_length=3, max_length=400)
    aspect: str
    evidence_ids: list[str] = Field(default_factory=list, max_length=12)


class _Improvement(_Item):
    suggested_action: str = Field(default="", max_length=400)


class _Summary(BaseModel):
    strengths: list[_Item] = Field(default_factory=list, max_length=8)
    improvements: list[_Improvement] = Field(default_factory=list, max_length=8)
    overall_summary: str = Field(default="", max_length=900)


# --------------------------------------------------------------------------- input


def evidence_pool(stats: dict[str, Any]) -> list[dict[str, Any]]:
    """At most 40 sentences, round-robin over aspects so no aspect crowds out the others.

    Positive and negative evidence first, neutral after, possibly-sarcastic sentences last.
    """
    queues: list[list[dict[str, Any]]] = []
    for key in ASPECT_KEYS:
        aspect = (stats.get("aspects") or {}).get(key) or {}
        evidence = aspect.get("evidence") or {}
        for polarity in ("positive", "negative", "neutral"):
            items = [
                {**e, "aspect": key, "polarity": polarity}
                for e in sorted(evidence.get(polarity, []), key=lambda e: e.get("uncertain", False))
            ]
            if items:
                queues.append(items)
    queues.sort(key=lambda q: q[0]["polarity"] == "neutral")
    pool, seen = [], set()
    while queues and len(pool) < MAX_EVIDENCE:
        for queue in list(queues):
            item = queue.pop(0)
            if item["id"] not in seen:
                seen.add(item["id"])
                pool.append(item)
            if not queue:
                queues.remove(queue)
            if len(pool) == MAX_EVIDENCE:
                break
    pool.sort(key=lambda e: e.get("uncertain", False))
    return pool


def _aspect_rows(stats: dict[str, Any]) -> list[dict[str, Any]]:
    rows = []
    for key in ASPECT_KEYS:
        a = (stats.get("aspects") or {}).get(key)
        if not a:
            continue
        pol = a.get("polarity", {})
        rows.append(
            {
                "aspect": key,
                "label": ASPECT_LABELS[key],
                "mentions": a.get("mentions", 0),
                "positive": pol.get("positive", 0),
                "neutral": pol.get("neutral", 0),
                "negative": pol.get("negative", 0),
                "rating_out_of_5": a.get("likert_mean"),
            }
        )
    return rows


# --------------------------------------------------------------------------- no-LLM path


def _plural(n: int, word: str) -> str:
    return f"{n} {word}{'' if n == 1 else 's'}"


def _rating(value: float | None) -> str:
    return f"; rated {value:.1f} out of 5" if value is not None else ""


def _ids(stats: dict[str, Any], key: str, polarity: str) -> list[str]:
    evidence = ((stats.get("aspects") or {}).get(key) or {}).get("evidence") or {}
    return [e["id"] for e in evidence.get(polarity, [])]


def fallback_items(stats: dict[str, Any]) -> tuple[list[dict], list[dict]]:
    """Strengths and improvements chosen from the aspect counts, each with its evidence ids."""
    rows = [r for r in _aspect_rows(stats) if r["mentions"] >= MIN_MENTIONS]
    strengths = []
    for r in sorted(rows, key=lambda r: (-r["positive"], -(r["rating_out_of_5"] or 0))):
        if r["positive"] < MIN_MENTIONS or r["positive"] <= r["negative"]:
            continue
        ids = _ids(stats, r["aspect"], "positive")
        if not ids:
            continue
        strengths.append(
            {
                "text": f"Students most often praise {r['label'].lower()}: "
                f"{_plural(r['positive'], 'positive mention')}{_rating(r['rating_out_of_5'])}.",
                "aspect": r["aspect"],
                "evidence_ids": ids,
            }
        )
    improvements = []
    for r in sorted(rows, key=lambda r: (-r["negative"], r["rating_out_of_5"] or 5)):
        if r["negative"] < MIN_MENTIONS:
            continue
        ids = _ids(stats, r["aspect"], "negative")
        if not ids:
            continue
        improvements.append(
            {
                "text": f"{r['label']} draws the most criticism: "
                f"{_plural(r['negative'], 'negative mention')}{_rating(r['rating_out_of_5'])}.",
                "aspect": r["aspect"],
                "evidence_ids": ids,
                "suggested_action": SUGGESTED_ACTIONS[r["aspect"]],
            }
        )
    return strengths[:MAX_ITEMS], improvements[:MAX_ITEMS]


def overall_sentence(stats: dict[str, Any]) -> str:
    """One templated sentence from the sentiment split (sarcastic answers count half)."""
    sentiment = stats.get("sentiment") or {}
    total = sum(sentiment.values())
    if not total:
        return f"{_plural(stats.get('responses', 0), 'student')} responded."
    pos = round(100 * sentiment.get("positive", 0) / total)
    neg = round(100 * sentiment.get("negative", 0) / total)
    return (
        f"{_plural(stats.get('responses', 0), 'student')} responded; {pos}% of their "
        f"responses read as positive overall and {neg}% as negative."
    )


def digest(pool: list[dict[str, Any]]) -> str | None:
    """distilbart over the strongest evidence; None if the summariser can't run."""
    texts = [e["text"] for e in pool if e["polarity"] != "neutral" and not e.get("uncertain")]
    if len(texts) < 3:
        return None
    try:
        from app.nlp import registry

        return registry.get("summarizer").summarize(" ".join(texts[:14]), max_new_tokens=90)
    except Exception:  # the digest is optional; never fail the summary for it
        log.exception("summariser failed")
        return None


# --------------------------------------------------------------------------- LLM path

SYSTEM = (
    "You summarise anonymous student feedback for one teacher and one course. Use ONLY the "
    "statistics and evidence sentences given. Do not invent facts, numbers, names or quotes. "
    "Every strength and improvement must cite the ids of the evidence sentences that support "
    "it. Write in plain, respectful English for the teacher. Return one JSON object with keys "
    '"strengths" (list of {"text", "aspect", "evidence_ids"}), "improvements" (list of '
    '{"text", "aspect", "evidence_ids", "suggested_action"}) and "overall_summary" (2-3 '
    f"sentences). At most {MAX_ITEMS} of each. Aspect must be one of: {', '.join(ASPECT_KEYS)}."
)


def _prompt(stats: dict[str, Any], pool: list[dict[str, Any]]) -> str:
    return json.dumps(
        {
            "responses": stats.get("responses"),
            "sentiment_weights": stats.get("sentiment"),
            "aspects": _aspect_rows(stats),
            "evidence": [
                {
                    "id": e["id"],
                    "aspect": e["aspect"],
                    "polarity": e["polarity"],
                    "possibly_sarcastic": bool(e.get("uncertain")),
                    "text": e["text"],
                }
                for e in pool
            ],
        },
        ensure_ascii=False,
    )


def ground(summary: _Summary, valid_ids: set[str]) -> tuple[list[dict], list[dict]]:
    """Keep only items about a known aspect that cite at least one real evidence id."""

    def keep(items, extra: tuple[str, ...] = ()):
        out = []
        for item in items:
            ids = [i for i in dict.fromkeys(item.evidence_ids) if i in valid_ids]
            if item.aspect in ASPECT_KEYS and ids:
                out.append(
                    {
                        "text": item.text.strip(),
                        "aspect": item.aspect,
                        "evidence_ids": ids,
                        **{k: getattr(item, k).strip() for k in extra},
                    }
                )
        return out[:MAX_ITEMS]

    return keep(summary.strengths), keep(summary.improvements, ("suggested_action",))


# --------------------------------------------------------------------------- entry point


def summarise(stats: dict[str, Any]) -> dict[str, Any]:
    pool = evidence_pool(stats)
    valid = {e["id"] for e in pool}
    base = overall_sentence(stats)
    if pool:
        out, meta = llm.complete_json(SYSTEM, _prompt(stats, pool), _Summary)
        if out is not None:
            strengths, improvements = ground(out, valid)
            dropped = (
                len(out.strengths) + len(out.improvements) - len(strengths) - len(improvements)
            )
            if strengths or improvements:
                return {
                    "strengths": strengths,
                    "improvements": improvements,
                    "overall_summary": out.overall_summary.strip() or base,
                    "digest": None,
                    "engine": meta["engine"],
                    "dropped_ungrounded": dropped,
                }
            log.warning("LLM summary had no grounded items; using the fallback")
    strengths, improvements = fallback_items(stats)
    return {
        "strengths": strengths,
        "improvements": improvements,
        "overall_summary": base,
        "digest": digest(pool),
        "engine": "fallback",
        "dropped_ungrounded": 0,
    }
