"""Grounded faculty profile drafts (SPEC §7).

Facts come only from the accepted profile data and the user record; each fact keeps the id it
already has (`q…`, `e…`, `p…`, `a…`) or gets one (`i:<tag>`, `user:*`). The LLM sees only these
facts. Its output is checked: every number must occur in the facts, every venue- or award-like
phrase must occur in the facts, achievements must match real ones, highlights must cite real
evidence ids. One failed check gets one retry with the problems listed; after that, or with no
LLM at all, a deterministic template is used. Nothing here touches the database.
"""

import json
import re
from typing import Any

from pydantic import BaseModel, Field

from app.nlp import llm

# --------------------------------------------------------------------------- facts


def build_facts(
    user: dict[str, Any],
    department: dict[str, Any] | None,
    profile: dict[str, Any],
    highlights: list[dict[str, Any]],
) -> dict[str, Any]:
    """Everything the generator may use, each item with an id it can cite."""
    pubs = sorted(profile.get("publications", []), key=lambda p: p.get("year") or 0, reverse=True)
    return {
        "name": user["name"],
        "designation": profile.get("designation"),
        "department": department["name"] if department else None,
        "interests": [{"id": f"i:{t}", "tag": t} for t in profile.get("interests", [])],
        "qualifications": [
            _pick(q, "degree", "specialisation", "institution", "year")
            for q in profile.get("qualifications", [])
        ],
        "experience": [
            _pick(e, "role", "institution", "department", "from_year", "to_year")
            for e in profile.get("experience", [])
        ],
        "publications": [
            _pick(p, "title", "venue", "year", "type", "citations", "tldr") for p in pubs[:25]
        ],
        "publication_count": len(pubs),
        "achievements": [
            _pick(a, "kind", "title", "detail", "year") for a in profile.get("achievements", [])
        ],
        "teaching_highlights": [
            {"text": h["text"], "aspect": h.get("aspect"), "evidence_ids": h["evidence_ids"]}
            for h in highlights
        ],
    }


def _pick(item: dict[str, Any], *keys: str) -> dict[str, Any]:
    return {"id": item.get("id"), **{k: item.get(k) for k in keys if item.get(k) not in (None, "")}}


def fact_ids(facts: dict[str, Any]) -> set[str]:
    ids = {"user:name", "user:designation", "user:department"}
    for section in ("interests", "qualifications", "experience", "publications", "achievements"):
        ids |= {f["id"] for f in facts[section] if f.get("id")}
    return ids


# --------------------------------------------------------------------------- keywords

_NOT_A_TOPIC = re.compile(r"^\d+$|^.{1,2}$")


def keywords(facts: dict[str, Any], top: int = 8) -> list[str]:
    """TF-IDF over publication titles + TL;DRs, plus interest tags (classic NLP, not a model)."""
    docs = [" ".join(filter(None, [p.get("title"), p.get("tldr")])) for p in facts["publications"]]
    tags = [i["tag"] for i in facts["interests"]]
    docs = [d for d in docs if d.strip()]
    if not docs:
        return tags[:top]
    from sklearn.feature_extraction.text import TfidfVectorizer

    vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), sublinear_tf=True)
    try:
        matrix = vectorizer.fit_transform(docs + tags)
    except ValueError:  # every word was a stopword
        return tags[:top]
    scores = matrix.sum(axis=0).A1
    terms = vectorizer.get_feature_names_out()
    ranked = [terms[i] for i in scores.argsort()[::-1] if not _NOT_A_TOPIC.match(terms[i])]
    out: list[str] = []
    for term in ranked:
        # Prefer "machine learning" over also listing "machine" and "learning".
        if any(term in kept or kept in term for kept in out):
            continue
        out.append(term)
        if len(out) == top:
            break
    return out


# --------------------------------------------------------------------------- template


def _join(items: list[str]) -> str:
    items = [i for i in items if i]
    if len(items) <= 1:
        return "".join(items)
    return f"{', '.join(items[:-1])} and {items[-1]}"


def _article(word: str) -> str:
    return "an" if word[:1].lower() in "aeiou" else "a"


def _qualification(q: dict[str, Any]) -> str:
    text = q["degree"]
    if q.get("specialisation"):
        text += f" in {q['specialisation']}"
    text += f" from {q['institution']}"
    if q.get("year"):
        text += f" ({q['year']})"
    return text


def template(facts: dict[str, Any], topics: list[str]) -> dict[str, Any]:
    """A plain, factual profile built only from the facts (the no-LLM path)."""
    name = facts["name"]
    role = facts.get("designation") or "Faculty member"
    dept = facts.get("department")
    sources: dict[str, list[str]] = {"headline": ["user:designation", "user:department"]}

    headline = role + (f", {dept}" if dept else "")
    where = dept if (dept or "").lower().startswith("department") else f"Department of {dept}"
    intro = f"{name} is {_article(role)} {role}" + (f" in the {where}." if dept else ".")
    short = [intro]
    long_ = [intro]
    src_short = ["user:name", "user:designation", "user:department"]

    areas = [i["tag"] for i in facts["interests"]][:6]
    areas += [t for t in topics if t.lower() not in {a.lower() for a in areas}][: 8 - len(areas)]
    if areas:
        line = f"Research interests include {_join(areas[:4])}."
        short.append(line)
        long_.append(f"Research interests include {_join(areas)}.")
        src_short += [i["id"] for i in facts["interests"]]

    quals = sorted(facts["qualifications"], key=lambda q: q.get("year") or 0, reverse=True)
    if quals:
        short.append(f"Holds {_article(quals[0]['degree'])} {_qualification(quals[0])}.")
        long_.append(f"Qualifications: {_join([_qualification(q) for q in quals])}.")
        src_short.append(quals[0]["id"])

    current = [e for e in facts["experience"] if not e.get("to_year")]
    if current or facts["experience"]:
        e = (current or facts["experience"])[0]
        since = f" since {e['from_year']}" if e.get("from_year") else ""
        long_.append(f"Works as {e['role']} at {e['institution']}{since}.")
        sources["bio_long_experience"] = [e["id"]]

    pubs = facts["publications"]
    if pubs:
        latest = pubs[0]
        where = f" in {latest['venue']}" if latest.get("venue") else ""
        when = f" ({latest['year']})" if latest.get("year") else ""
        long_.append(
            f"Has {facts['publication_count']} publication"
            f"{'' if facts['publication_count'] == 1 else 's'} on record, most recently "
            f"“{latest['title']}”{where}{when}."
        )

    achievements = sorted(facts["achievements"], key=lambda a: a.get("year") or 0, reverse=True)
    key_achievements = [
        a["title"] + (f" ({a['year']})" if a.get("year") else "") for a in achievements[:5]
    ]
    if key_achievements:
        long_.append(f"Recognition includes {_join(key_achievements[:3])}.")

    highlights = facts["teaching_highlights"][:3]
    if highlights:
        long_.append("From student feedback: " + " ".join(h["text"] for h in highlights))

    sources.update(
        {
            "bio_short": src_short,
            "bio_long": src_short
            + [q["id"] for q in quals]
            + [p["id"] for p in pubs[:1]]
            + [a["id"] for a in achievements[:3]],
            "key_achievements": [a["id"] for a in achievements[:5]],
            "research_areas": [i["id"] for i in facts["interests"]],
        }
    )
    return {
        "headline": headline,
        "bio_short": " ".join(short),
        "bio_long": " ".join(long_),
        "research_areas": areas,
        "key_achievements": key_achievements,
        "teaching_highlights": [
            {"text": h["text"], "evidence_ids": h["evidence_ids"]} for h in highlights
        ],
        "sources": {k: [i for i in v if i] for k, v in sources.items()},
    }


# --------------------------------------------------------------------------- LLM path


class _Highlight(BaseModel):
    text: str = Field(min_length=3, max_length=400)
    evidence_ids: list[str] = Field(default_factory=list, max_length=12)


class _Profile(BaseModel):
    headline: str = Field(min_length=3, max_length=200)
    bio_short: str = Field(min_length=20, max_length=900)
    bio_long: str = Field(min_length=40, max_length=2200)
    research_areas: list[str] = Field(default_factory=list, max_length=12)
    key_achievements: list[str] = Field(default_factory=list, max_length=10)
    teaching_highlights: list[_Highlight] = Field(default_factory=list, max_length=6)
    sources: dict[str, list[str]] = Field(default_factory=dict)


SYSTEM = (
    "You write a short academic profile of a faculty member for their college website. Use ONLY "
    "the facts in the JSON you are given. Never add a number, year, venue, award, degree, "
    "institution, title or claim that is not in the facts. Do not use he/she pronouns; use the "
    "person's name or rephrase. Return one JSON object with keys: headline (under 15 words), "
    "bio_short (about 60 words), bio_long (about 150 words), research_areas (list of short "
    "phrases), key_achievements (list, copied from the facts' achievements), "
    "teaching_highlights (list of {text, evidence_ids}, only from the facts' teaching "
    "highlights, keeping their evidence_ids), sources (map each field name to the fact ids it "
    "used)."
)

_VENUE_WORDS = (
    "journal|transactions|conference|proceedings|symposium|workshop|award|prize|medal|"
    "fellowship|fellow|grant|patent|ieee|acm|springer|elsevier"
)
_CAPITALISED = re.compile(
    r"\b(?:[A-Z][\w&.-]*|of|on|in|for|and|the)(?:\s+(?:[A-Z][\w&.-]*|of|on|in|for|and|the))*"
)


def _blob(facts: dict[str, Any]) -> str:
    return json.dumps(facts, ensure_ascii=False).lower()


def problems(out: _Profile, facts: dict[str, Any]) -> list[str]:
    """Claims in the draft that the facts do not support."""
    blob = _blob(facts)
    text = " ".join([out.headline, out.bio_short, out.bio_long, *out.key_achievements])
    found: list[str] = []
    for number in set(re.findall(r"\d+(?:\.\d+)?", text)):
        if number not in blob:
            found.append(f"the number {number} is not in the facts")
    for phrase in set(_CAPITALISED.findall(text)):
        phrase = phrase.strip(" .,")
        if re.search(_VENUE_WORDS, phrase, re.I) and phrase.lower() not in blob:
            found.append(f"“{phrase}” is not in the facts")
    titles = [a["title"].lower() for a in facts["achievements"]]
    for item in out.key_achievements:
        if not any(t in item.lower() or item.lower().split(" (")[0] in t for t in titles):
            found.append(f"the achievement “{item}” is not in the facts")
    return found


def _clean(out: _Profile, facts: dict[str, Any]) -> dict[str, Any]:
    allowed_ids = fact_ids(facts)
    evidence = {i for h in facts["teaching_highlights"] for i in h["evidence_ids"]}
    blob = _blob(facts)
    return {
        "headline": out.headline.strip(),
        "bio_short": out.bio_short.strip(),
        "bio_long": out.bio_long.strip(),
        # A research area must come from the facts (an interest, a title, a TL;DR).
        "research_areas": [a.strip() for a in out.research_areas if a.strip().lower() in blob][:8],
        "key_achievements": out.key_achievements[:5],
        "teaching_highlights": [
            {"text": h.text.strip(), "evidence_ids": [i for i in h.evidence_ids if i in evidence]}
            for h in out.teaching_highlights
            if any(i in evidence for i in h.evidence_ids)
        ],
        "sources": {k: [i for i in v if i in allowed_ids] for k, v in out.sources.items()},
    }


def generate(facts: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    """(fields, meta). meta: engine, keywords, and any problems that forced the template."""
    topics = keywords(facts)
    payload = {**facts, "research_keywords": topics}
    user_prompt = json.dumps(payload, ensure_ascii=False)
    issues: list[str] = []
    for attempt in range(2):
        prompt = user_prompt
        if issues:
            prompt += "\n\nYour previous draft had problems; fix them: " + "; ".join(issues[:8])
        out, meta = llm.complete_json(SYSTEM, prompt, _Profile)
        if out is None:
            break
        issues = problems(out, facts)
        if not issues:
            return _clean(out, facts), {"engine": meta["engine"], "keywords": topics}
        if attempt == 1:
            break
    return template(facts, topics), {
        "engine": "template",
        "keywords": topics,
        **({"rejected": issues} if issues else {}),
    }
