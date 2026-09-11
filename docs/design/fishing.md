# Fishing database surface

Mode: Operate. Target: `src/pages/FishingPage.tsx` / `#fishing`.

Extend the existing task-ledger world without changing the shared tokens or shell.
Players search for a target fish, inspect its bait and time/weather prerequisites,
and maintain a device-local list of targets and catches. Every row includes time
and weather requirements, using game weather icons with accessible names; explicit
unrestricted states remain visible. Detail adds a selectable local weather forecast.

The first viewport contains a plain feature heading, an Eorzean clock, labeled
search and sorting above comparable fish rows, beside compact multi-select filters.
On mobile the filter panel starts collapsed. The entire fish row
opens a focused catch sheet rather than squeezing another pane beside the list.
Returning restores list context. The catch sheet foregrounds bait/mooch order and
the preceding-to-current weather requirement. Real local times make upcoming
windows actionable without implying catch success.

Open windows show remaining time; closed ones count down to the next opening.
The catch sheet places ten expandable window entries beside conditions, bait images,
and locations. Wiki acquisitions appear on bait hover, focus, or touch.

Use existing system typography, ivory/charcoal semantic surfaces, gold selection,
and semantic green with text for eligible time/weather conditions. Keep all
decorative motion absent. On narrow screens controls wrap, detail sections stack,
and only the data table scrolls horizontally. No full-page overflow.

Unknown conditions remain visible. Empty results direct players to change filters;
missing source data explains its limits and provides reference destinations.
