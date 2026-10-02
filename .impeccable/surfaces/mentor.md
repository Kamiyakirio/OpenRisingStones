# Mentor Roulette Recorder Surface

## Purpose and authority

**Mode: Operate. Route: `#mentor`.** This workspace serves an FF14 player who
wants a trustworthy local history of Duty Roulette: Mentor runs while the game
is open. The first thing the player needs to know is whether the current run is
being tracked. Historical records, corrections, and migration follow that
answer.

The surface extends the existing OpenRisingStones design system in `DESIGN.md`:
warm neutral surfaces, restrained gold for selection and primary actions, system
sans-serif text, ruled rows, and Phosphor outline icons. The reference site's
layout, chart choices, copy, and import/export flow have no visual authority.

## Information model

- A run has one character, one duty, the job at entry, entry and end times,
  source, result, and optional note. Results are **completed**, **exited**, or
  **needs review**. Source is shown separately as game, manual, or legacy site.
- Exiting before a confirmed completion creates an **exited** record. Exiting
  after completion leaves the completed record intact. Disconnection or an
  interrupted monitor may yield **needs review**; it must not silently invent a
  completion or exit.
- Legacy records may have no trustworthy result or character identifier. Preserve
  this as **result not marked** until the player assigns a meaning. Imported
  entries retain their original time, source identifier, and note where present.
- Completed counts include only records marked completed. The workspace shows
  recorded totals separately so exits and ambiguous imports remain visible.

## Composition

The page has one task order: **current run -> history -> data management**.

1. A compact heading names the tool and shows the monitor state and active
   character. A connection action appears only when the game bridge is idle or
   disconnected; the existing process-injection consent pattern applies.
2. A single live-session strip represents the real sequence **queue -> duty ->
   result**. It shows timestamps and only highlights stages supported by game
   evidence. When idle, it says that it is waiting for a Mentor roulette. During
   a run, the duty and job are prominent, with elapsed time and the last
   confirmed event. On completion or exit, the terminal state names the result
   and points to its new history row. This sequence is the page's signature
   element because it explains why a record exists.
3. A quiet summary line shows total records, completed runs, exits, and records
   needing review. These are aligned figures with text labels, not a hero metric
   or a grid of promotional cards.
4. History is the main working area. Search by duty name, filter by result and
   job, and group recent records by day. Desktop rows show time, duty, job,
   result, source, and note affordance. Narrow layouts turn each row into a
   two-line item rather than forcing a horizontally scrolling table. A row
   opens an inline detail region with the event times, note, and correction
   controls. A secondary **add missed run** action supports manual recovery
   when the game monitor was unavailable. Status uses a word and semantic
   color; color never carries meaning alone.
5. Data management is a separate secondary view reached from the page-level
   action. It contains legacy-site migration and a local backup action. It does
   not compete with the live-session and history tasks.

## Legacy-site migration flow

The player enters the legacy-site email and password in a labeled, temporary
form. The application uses the site's normal login and paginated record-list
reads. It must never trigger the site's account-freezing export endpoint. The
password and session are not stored, logged, or reused after the migration.

The flow is **sign in and read -> review -> save locally**. Review shows the
number fetched, source account, date span, invalid rows, and duplicates before
writing. The player assigns historical records to a local character if the
source cannot identify one, and chooses how to classify records without an
explicit result. Saving is all-or-nothing and reports imported, skipped, and
needs-review counts. Running migration again must not duplicate the same source
records. Errors preserve existing local data and explain the next available
action.

## States and feedback

- **First use:** explain that monitoring starts after connecting to the running
  game, then present the existing consent flow. Do not suggest that merely
  opening this page starts verified tracking.
- **Waiting:** show the active character and a plain waiting message. A normal
  duty queue must not appear as Mentor roulette.
- **Queued / in duty / completed / exited:** update the one session strip in
  place. A short status message confirms when a record is saved.
- **Connection lost:** keep the last confirmed stage visible, stop asserting
  live state, and mark any unresolved run for review.
- **Empty history:** state that the next confirmed Mentor roulette will appear
  here; offer the migration path for existing records.
- **Migration:** visibly distinguish credential entry, fetching, review, write,
  and completion. Disable duplicate submission and support retry without
  changing already saved records.

## Interaction and layout guardrails

- Monitoring belongs to desktop backend state so it continues when this route
  is closed. The page observes it; the page lifecycle must not own run detection.
- Keep one active session at a time per character. Never create a record from a
  territory transition alone, and never save the same run at both completion and
  exit.
- Use 40px minimum controls and at least 44px on coarse pointers. Preserve
  visible keyboard focus, labeled fields, live-region feedback for result
  changes, and reduced-motion behavior.
- On narrow viewports stack the session facts and filters, but keep the
  queue-duty-result order and distinguish all result states in the same way.
- Use direct Chinese FF14 wording for the shipped UI. Do not add fantasy
  slogans, large illustrations, ornamental charts, or borrowed site visuals.
