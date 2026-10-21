# FacultyLens design system

Settled in Phase 0. Every later page reuses it. Tokens are in `frontend/src/styles/tokens.css` (raw values per theme) and mapped to Tailwind utilities in `frontend/src/styles/index.css` (`@theme inline`). Change values there, never inline in components.

## Direction

**Calm academic, "achromatic ledger".** This style came from the design-taste-frontend app draw (`--kind analytics --style achromatic-ledger`, seed 1993640354), and it fits the user's "calm academic" choice. FacultyLens is a working tool for IQAC staff, HoDs and faculty, read in long sessions near NAAC deadlines. It should feel like a well-kept university register, not a SaaS dashboard.

- **The chrome holds no colour.** Text and controls are ink; the primary action is near-black.
- **Colour is for data and judgement only:** the one chart hue on the main data element, the sentiment pair on sentiment, and status pills where something is good or bad.
- **Its face:** a blue-grey "ledger" ground (`#f2f4f7`) under white cards, and a serif used for one job: page titles (and later the faculty member's name on the unified page).
- **Its signature element** (from Phase 5): the evidence link. Every strength or improvement opens the redacted sentences that support it, highlighted in place.

## Colour

| Role | Light | Dark | Use |
|---|---|---|---|
| `--ground` | `#f2f4f7` | `#0b0b0c` | page and sidebar |
| `--surface` | `#ffffff` | `#151516` | cards, tables |
| `--raised` / `--active` | `#f7f8fa` / `#e6e9ee` | `#1c1c1e` / `#262628` | hover, active nav pill, skeletons |
| `--border` / `--rule` / `--control` | `#e3e6eb` / `#eef0f3` / `#cfd4db` | `#2a2a2d` / `#202022` / `#46464a` | card edge / row rule / input border |
| `--text` / `--muted` / `--faint` | `#0e0f11` / `#535960` / `#626870` | `#f4f4f5` / `#b4b4b8` / `#9a9aa0` | three text tiers, all ≥ 4.5:1 |
| `--primary` | `#16181b` | `#f4f4f5` (inverted) | the one primary button |
| `--chart-main` | `#1d5fbf` | `#3987e5` | the main series in any chart |
| `--focus` | `#1d5fbf` | `#6ea3ec` | 2px focus ring, 2px offset |

**Sentiment (diverging, never red/green):** positive `#2a78d6` / `#3987e5`, neutral `#8a8a8a` / `#a3a3a3`, negative `#e34948` / `#e66767`. Validated with the dataviz `validate_palette.js`. In light mode every adjacent pair passes CVD separation. Dark neutral was lifted to `#a3a3a3` so red↔grey clears the CVD threshold (8.1). The grey midpoint "fails" the chroma check on purpose, because neutral must read as no colour. **Rule:** sentiment marks always carry a text label or legend (positive / neutral / negative); colour never carries the meaning alone.

**Status pills:** pale tint plus dark ink of the same hue (positive, negative, warning, neutral). They appear only inside rows or beside a value, never above a heading.

Theme: the OS setting by default. `<html data-theme="light|dark">` overrides it both ways (the sidebar's Theme switch, stored in `localStorage` as a per-viewer convenience). An inline script in `index.html` applies it before first paint.

## Type

- **Geist Variable** (self-hosted via @fontsource, works offline) for everything.
- **Source Serif 4 Variable** for page titles only.
- Monospace (system `ui-monospace`) only for IDs and model keys.
- Fixed rem scale, ratio ~1.2:

| Token | Size / line | Use |
|---|---|---|
| `text-small` | 12 / 16 | labels, meta, table headers, pills |
| `text-body` | 14 / 20 | body, nav, cells |
| `text-section` | 16 / 24 | section headings (500) |
| `text-lead` | 18 / 26 | values in a stat strip |
| `text-title` | 24 / 32 | page title (serif 600, -0.01em) |
| `text-kpi` | 30 / 36 | headline figures (max one per screen) |

- Weights: 400 / 500 / 600.
- `.num` (tabular figures) on every number in a table, stat or anything that updates. Numbers are right-aligned in columns.
- Sentence case everywhere; no tracked uppercase labels.

## Space and shape

- 4px base. One gap (`--gap` 12px) between sibling cards. Card padding 20px. Canvas padding 32px on desktop and 16px on a phone.
- Content column max 1184px. Sections 40px apart.
- Radius: cards 8px, controls 6px, chips 4px (the tight pair, chosen once).
- Surfaces are separated by a 1px border **or** a tone step, never a shadow. Shadows only on what floats (menus, dialogs).
- Stat strips are one card split by 1px dividers (implemented as a 1px grid gap over `--rule`), never a row of separate KPI tiles. No icons on KPIs and no sparklines.

## Shell

**Open plane.**
- A 256px labelled sidebar on the page ground, one hairline to the canvas.
- The product mark (a lens over three feedback bars, `components/Mark.jsx`), the name and the institution sit at the top; the theme switch sits at the bottom.
- The active nav item is a neutral grey pill. Only screens that exist are listed.
- There is no top bar on desktop.
- **Below 1024px** the sidebar folds into a 48px top bar (mark, screen name, menu button) and a full-screen `<dialog>` sheet. Esc closes the sheet and focus returns to the trigger.

## Components (in `styles/index.css`)

- `.btn` + `.btn-primary` (near-black), `.btn-secondary` (grey), `.btn-ghost`: 36px tall.
- `.pill` + `.pill-positive|negative|warning|neutral`.
- `.card`: white surface, 1px border, 8px radius.
- `.skeleton`: a flat bar at the real size of the value it replaces, with no shimmer and no layout shift when data lands.
- Tables: 12px grey sentence-case headers, 44px rows, 1px row rules, no zebra stripes and no header band. Below 768px a table becomes two-line rows (identity + status on line 1, detail on line 2). Tablet hides the least important columns.

## Phase 1 additions

- **Forms** (`components/forms.jsx`):
  - The label sits above a 40px control (1px `--control` border, 6px radius, `--focus` ring); a hint or error goes underneath.
  - An error replaces the hint, is linked with `aria-describedby` and announced with `role="alert"`.
  - Validation happens inline as the user types (mismatch, too short). The submit button stays disabled until the form can succeed.
  - `FormError` shows one sentence after a negative pill.
- **Panels instead of modals.** Add, edit and bulk-add open as an inline `Panel` under the page title (`components/PageHeader.jsx`), never a modal. The only dialog is the phone menu sheet. Deactivation uses the browser's native `confirm()`.
- **One-time secrets** (`CredentialsNotice`):
  - The panel stays until the admin clicks "I've saved them".
  - It offers "Download CSV" as the primary action, with the warning in `--warning` ink.
  - Temporary passwords are monospace and `select-all`.
- **Signed-out screens** (`StandaloneLayout`):
  - The brand row, a 400px form column, and an aside of real product facts on desktop (stacked on phones), all on one centred 1184px column.
  - The login aside explains anonymity, moderation, minimum responses and profile approval in plain words. It makes no numeric claims.
- **Account row** at the sidebar foot: name, role (and roll number for students), "Change password" and "Sign out" as underlined text actions.
- **Row actions** are ghost buttons at 12px. A destructive action uses `text-negative`.
- **Status pills on users:** Active (positive), Temporary password (warning), Deactivated (neutral).
- **Monospace** only for roll numbers, model IDs and temporary passwords. These are keys, which the app rules allow.
- **Checks (Phase 1):**
  - Taste `lint --app`: 0 FAIL.
  - Login `inspect --app`: 0 FAIL, and 1 defended WARN (the empty area under the sign-in form is the screen's single rest).
  - impeccable `detect`: no findings.
  - Signed-in screens checked through Playwright at 1440, 768 and 390.

## Phase 2 additions

- **Review queue** (`pages/profile/ReviewPanel.jsx`):
  - A card above the page body whenever imports are pending. Its heading is the count ("35 imported items wait for your review").
  - Underline tabs per kind, with counts.
  - Group actions on the right: "Reject all N" as ghost, "Accept all N" as secondary.
  - Each row shows the title, a grey meta line, a provenance pill, and Reject / Accept.
  - The list scrolls inside the card past 520px.
  - Decisions save immediately and merge into the form without touching unsaved edits.
- **Provenance pill** (`SourceTag`): a neutral pill saying "ORCID" or "Semantic Scholar". It is never coloured: it shows where a fact came from, not a status. Manual items show nothing.
- **Row editor** (`RowListEditor`):
  - On desktop, one muted header row with aligned 36px inputs per item.
  - The actions column (pill + Remove) is 168px.
  - Phones stack each item with its own small labels. Every input has an aria-label naming its row ("Year (qualification 2)").
- **Tag input:** chips are neutral pills with a 20px remove button. Enter or comma adds a tag; Backspace on an empty input removes the last.
- **Long lists** (publications) are a readable list rather than an input grid. Edit expands an inline form on a `--raised` panel, and a filter box appears past 8 items.
- **Save model:**
  - A single "Save changes" primary in the title row, enabled only when the form differs from the last save.
  - The status line beside it reads "Unsaved changes", "Saving…" or "All changes saved".
  - `beforeunload` warns on unsaved edits.
- **Two-column page:** `minmax(0,1fr) 360px`. The right rail (import, courses taught) comes first in the DOM, so on phones it sits above the long sections.

## Phase 3 additions

- **Rating control** (`components/LikertScale.jsx`):
  - Five equal segments, each showing its number *and* word (Poor, Fair, Good, Very good, Excellent), so colour never carries the meaning.
  - Native radios share one name inside a labelled `role="radiogroup"`: arrow keys change the value and Tab moves to the next question.
  - The selected segment is the near-black primary; segments are at least 48px tall for thumbs.
  - On desktop the question sits left and the scale right; on phones the scale goes underneath.
- **Missing answers:**
  - A missing rating shows only a quiet "Choose a rating." note in `--negative` under its question. There are no red borders on every row.
  - A single `role="alert"` summary above Submit lists the missing questions as links that focus them.
  - The live progress counter ("6 of 8 rated") is in the card header.
- **Anonymity copy:** every student screen says plainly how answers are stored ("without your name or roll number; a one-way code only stops a second submission"). Never "100% anonymous" or other claims.
- **One primary per list:** in a list of forms only the first pending row gets the primary button; the rest are secondary.
- **Rate bar** (`components/RateBar.jsx`):
  - A part-of-whole bar at its true ratio in `--chart-main`, 6px tall on an `--active` track.
  - The label reads "212 of 288 responses" on the left and the percentage on the right.
  - It shows a grey dash when nothing is eligible, and is used for response rates everywhere.
- **Cycle status:** pills read Draft (neutral), Open (positive), Closed (neutral). Publishing explains what it will create before the button, and why offerings are skipped.

## Phase 4 additions

- **Analysis runner** (`pages/admin/AnalysisPage.jsx`):
  - The screen's question is "how much of this cycle is analysed, and what did it flag?".
  - A cycle select, then one divided card with three figures (Responses, Analysed, Waiting) at `text-lead`. It stays three across even on a phone.
  - The one primary button, "Analyse waiting responses", is disabled when nothing waits or a run is active.
  - While a run is active, a progress card shows a `RateBar` in `--chart-main`, elapsed time and ms per response, polling every 2 s. The coverage figures and the jobs-table row follow the live job.
  - After a run, a findings list (hidden, review, PII redacted, possibly sarcastic) with right-aligned tabular counts and a "Review flagged answers →" link.
  - Recent runs as a table; Time and Per response hide below 1024px.
  - Job pills: Queued/Running (neutral), Done (positive), Failed (negative, with the error under the run name), Interrupted (warning).
- **Moderation queue** (`pages/admin/ModerationPage.jsx`):
  - One card with underline tabs ("Waiting for a decision 18", "Decided") and a kind filter.
  - Each item shows a kind pill (Hidden negative, Needs review warning), the abuse score in tabular figures, and the harm label in words. A meta line follows: course · teacher · which answer.
  - The redacted text has the flagged sentence marked in place: a `<mark>` in the negative pill's tint and ink, with its score in the title.
  - When no flagged sentence reads as negative, a muted note says it may be a false alarm (see MODEL_CHECK.md).
  - Actions: "Show to faculty" (secondary), "Keep hidden"/"Hide" and "Edit and show" (ghost). Edit opens an inline textarea labelled with what faculty will see. There is no primary button in a list of decisions.
  - Decided items show the decision pill, time and edited text.
- **Nav count:** "Moderation 18" is a small surface chip on the nav row. It appears only when items are pending, refreshes after every decision (a window event) and each minute, and is read as "18 pending".

## Phase 5 additions

- **Unified faculty page** (`pages/faculty/*`, `/me` and `/faculty/:id`):
  - Two columns: the profile (360px, sticky on desktop) and the feedback insights. They stack on tablets and phones, profile first.
  - The name is the page's one serif title.
  - Staff outside the department get the profile and one sentence saying feedback is private.
- **Profile column:**
  - headline and department meta;
  - the short bio with a "Read the full bio" toggle;
  - research areas as neutral pills;
  - recent publications (title linked to its DOI or URL, venue · year in tabular figures, TL;DR muted);
  - achievements with the year right-aligned;
  - teaching highlights.
  - Sections are separated by a 1px rule, not cards.
- **Insights order** (each block answers one question):
  1. Cycle and course pickers with the response `RateBar`.
  2. Net sentiment, the screen's one `text-kpi` figure, signed to 2 decimals, beside the sentiment split as a labelled 100% bar (negative, neutral, positive with 2px gaps and percentages underneath).
  3. "What students said": the overall sentence, then Strengths and Areas to improve as two cards. Each item has an aspect pill, the text, "Next step:" for improvements, and an underlined "Show the evidence (n)" text button. An automatic digest sits in a `--raised` well, labelled as automatic. A muted line says how the text was written.
  4. Teaching aspects as one table: aspect + mentions, a diverging comment bar (criticism left of a 1px centre line, praise right, neutral split across it, 2px gaps, 3px outer radius), the mean rating ("4.2 / 5") and a ratings-vs-comments pill (Agree positive, Mixed neutral, Disagree warning, Too few neutral). The pill's title gives Spearman ρ and n. On phones the bar moves under the aspect name.
  5. Emotion mix (Recharts horizontal bars, the top emotion in `--chart-main` and the rest in `--chart-muted`, values labelled at the bar ends, an `sr-only` table) beside a caveats card: possibly sarcastic count with "Read them", and the hidden-by-moderation count.
- **Evidence drawer** (`components/EvidenceDrawer.jsx`):
  - A native modal `<dialog>` pinned to the right edge (max 520px, full height, 1px left border).
  - It enters 16px from the right over `--dur-sheet` and closes on Esc, Close or a backdrop click; focus returns to the opener.
  - Each answer shows which question it answered, then the redacted text with the supporting sentence as a `<mark>` in a 22% tint of the item's sentiment colour. Text stays in ink, never the sentiment colour.
  - The answers are introduced by a sentence explaining they are moderated and redacted.
- **Generated profile review** (`/profile/review`):
  - The draft's fields on the left, and on the right a rail of saved facts with "cited" pills for the facts this version references.
  - The status pill (Draft warning, Approved positive, Superseded neutral), version, date and how it was written.
  - "Generate new draft" (secondary) and "Approve and publish" (the one primary, owner only; an admin gets "Save edits").
  - Bios auto-grow (`field-sizing: content`), with live word counts against the 60 / 150 targets.
  - Rejected AI claims are listed in a `--raised` note when the template was used instead.
- **Code splitting:** the unified page and Recharts load as their own chunk (`React.lazy`), so other screens don't download the chart library.

## Phase 6 additions

- **Department insights** (`/insights`, `pages/insights/*`, lazy-loaded):
  - HoDs see their own department and the title is its name; admins get a department picker.
  - The cycle picker and tabs (Overview, Bias & sarcasm) are kept in the URL (`?department&cycle&tab`), so a view can be reloaded or shared.
  - The tabs are underlined, matching the moderation queue.
- **Overview:**
  - A divided stat strip: response `RateBar`, net sentiment as the screen's one `text-kpi`, and hidden by moderation.
  - A sortable teacher table: header buttons with `aria-sort` and a small ▲/▼; empty values always sort last. Columns: name linked to `/faculty/:id`, responses, net sentiment, rating, top strength / area to improve as neutral pills, and possibly sarcastic.
    - A teacher below the minimum gets one muted line instead of numbers.
    - The table scrolls sideways inside its card under 880px.
    - It has no gender column.
  - Then the department aspects (the shared `Aspects` table without the agreement column).
- **Bias & sarcasm panel:**
  - **Caveat:** always first, a `--raised` note with a 1px border in ink ("Read with care. …"). It never uses alarm colour, and it stays visible in every state.
  - **Too small:** one card with the group sizes and why nothing is shown. There are no zeros and no empty charts.
  - **Two group hues** (`--group-1` blue, `--group-2` orange; categorical slots 1–2, checked with the dataviz validator in both modes; fixed order women, men). Every group mark also carries a text label or a legend with the teacher counts.
  - **Gendered language:** Recharts grouped horizontal bars with direct value labels, an `sr-only` table and a disclosure for the word lists.
  - **Rating gap:** a dot-and-whisker per aspect on a zero-centred track (1px centre line, 2px interval, 10px dot with a surface ring). It uses `--chart-main` when the interval excludes 0 and `--chart-muted` with "no clear difference" when it doesn't. The numbers are always written out ("−0.08 (could be −0.61 to +0.40)").
  - **Emotion mix:** paired thin bars per emotion on one scale, with percentages.
  - **Sarcasm:** a rate per group, plus a per-teacher list (not grouped by gender).
  - **Method:** a "How these numbers are made" disclosure.
- **My page:** "Across your courses" (only with two or more offerings in a cycle). Each course name selects that course below; an "All courses" line closes the table.

## Phase 7 additions

- **NAAC report builder** (`/admin/reports`): the cycle picker, then "Draft action items" (secondary; its title says edited and approved rows are never overwritten). Below that are two columns:
  - **Left:** the Action Taken rows grouped by department in cards. Each card header shows "n of m approved" and a ghost "Add an action".
  - **Right (sticky):** "Ready to export?" as a checklist with small round marks (✓ in the positive tint when done; screen-reader text says "Done"/"Not yet"), then the Export card.
- **Export card:**
  - "Download PDF" (the one primary) and "Word (.docx)" (secondary) unlock only when the report is ready. The reason sits under them in muted text ("3 actions still need approval").
  - Draft previews are always-on underlined text buttons below a rule, so a preview never competes with the final export.
  - Files download as blobs with the session token; a status line names the file.
- **Action Taken row** (`components/ActionTable.jsx`, shared with the HoD tab):
  - **Pills:** a status pill (Needs approval warning, Approved positive) and a neutral "Teaching · Pace & syllabus coverage" pill. Then the evidence count, and who drafted it (template or AI model, and whether it was edited).
  - **Body:** the issue as body text, then Action / Responsible / Timeline as a small definition list (three columns on desktop).
  - **Row actions:** small buttons. Approve (secondary) or Reopen (ghost), Edit, "Show the comments" (opens the evidence drawer with the row's own loader), and Delete for manual rows (admin only, after a native confirm).
  - **Editing** happens in place on a `--raised` panel built from `Field` controls, with "Save and approve", "Save as draft" and Cancel.
- **HoD "Action taken" tab** on Department insights: one paragraph saying what the rows are for and how many still need approval, then the same table for their department.
- **The printed report** keeps the app's restraint: DejaVu Sans, black ink, the sentiment trio and the single chart blue in the charts, light grey table headings, and the draft mark at 10% opacity across each page.

## Phase 8 additions

- **Segmented choice** (`components/Segmented.jsx`): native radios in a labelled radiogroup, drawn as equal joined segments like the rating scale. The selected segment is the primary ink. A `quiet` value (a default such as "Not mentioned") is only a grey `--active` tone, so eight untouched rows don't shout.
- **Labelling** (`/label`, only for accounts the admin marks as annotator or adjudicator; a nav item appears for them):
  - Underlined tabs: Label comments / Settle disagreements, Write reference summaries, Check summaries. The tab is kept in the URL.
  - Each task opens with a `RateBar` ("12 of 300 labelled"). The comment sits in a `--raised` figure at `text-section` size and 72ch.
  - Labelling is keyboard-first: keys 1, 2 and 3 choose the sentiment and Enter saves. The hint says so at the foot of the form.
  - Skipping asks for a reason with three small secondary buttons.
  - Adjudication shows both annotators' labels as two small cards, then a blank form. It is never prefilled, so neither side anchors the decision.
  - Grounding checks show each generated point with its quotes under a 2px rule and a Supported / Not supported segmented choice.
- **Evaluation** (`/admin/evaluation`, lazy-loaded with Recharts):
  - One card per question, in this order: labelling progress (a divided stat strip and a `RateBar` per annotator), sentiment, aspects, moderation and redaction, summaries, survey, and data and its limits.
  - **Sentiment chart:** horizontal bars of macro-F1 per model on a 0–1 scale, with value labels at the bar ends. The best model is in `--chart-main` and the rest in `--chart-muted`. There is no legend, because it is a single series and the title names it. The full table follows.
  - **Confusion matrix:** a table with tinted cells (`--chart-main` mixed into the surface by count) and the number always printed in each cell.
  - **Pending sections:** a section without data says what it needs ("this needs 100 gold-labelled comments") and shows a `RateBar` of progress. It never shows an empty chart or a zero.
- **Survey** (`/survey`): four `LikertScale` questions and an optional comment, reached from one muted line at the foot of the teacher's own My page.

## States (every block)

- **Loading:** final layout with skeleton bars.
- **Error:** inside the failed block. One sentence saying what failed and how to recover, plus a Retry text button; never a full-screen banner.
- **Missing value:** a grey en dash at text size.
- **Zero:** printed as `0`.
- **Empty:** the frame and header stay, with one sentence.
- **Refreshing:** keeps the old values, disables the button ("Checking…"), and updates the "Checked hh:mm:ss" stamp.

## Motion

- Feedback only; nothing performs an entrance.
- `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`. Press 140ms (`scale(0.97)` on `:active`), UI 180ms, sheet 240ms (rise 12px + fade via `@starting-style`).
- Hover effects are gated behind `(hover: hover) and (pointer: fine)`.
- `prefers-reduced-motion` drops travel and keeps state changes.

## Charts (from Phase 5)

Recharts, styled to these tokens, never library defaults.
- One hue per chart (`--chart-main`); comparison series in `--chart-ink` / `--chart-muted`.
- Sentiment uses the diverging trio above.
- 2px lines with no area gradients; 3–5 faint gridlines; no legend for a single series. A legend plus direct labels whenever there are 2 or more series.
- A crosshair tooltip on hover; a table view for accessibility; an empty chart draws its zero line with one sentence.

## Checks used

- design-taste-frontend `lint.mjs --app` and `inspect.mjs --app`: 0 FAIL, 0 WARN at 1440/768/390 on the status page. Mono is used for model IDs only.
- impeccable `detect`: no findings.
- Browser: light and dark, keyboard (skip link, radio group, dialog Esc/focus return), and the API-down error state all checked in the desktop app's browser.
- Phase 9: design-taste `lint --app` on the Phase 8 pages gave 0 FAIL and 2 WARN, both defended:
  - the shadow is on a chart tooltip, which floats;
  - the monospace text is the `model_version` key.
- Phase 9 fresh-clone run: every role's screens were visited with no console errors.
