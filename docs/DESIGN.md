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
