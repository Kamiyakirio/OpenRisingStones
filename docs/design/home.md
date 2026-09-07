# Home surface

Mode: Operate. Target: `src/pages/HomePage.tsx` and its stylesheet.
Status: direction B implemented and reviewed in the web UI.

## Scope and approval

The user selected B in the three-option comparison board, then authorized the UI
rebuild. The shared frame and feature workspaces now follow that direction. The
board establishes the principal visual language, not a literal pixel reproduction
of generated artwork. The user's
plain-copy requirement supersedes the board's slogans and decorative theme names.

Reference: `../../.impeccable/mocks/decision/ui-language-options.png`, middle panel.
Approval record: `../../.impeccable/mocks/decision/ui-language-options.json`.

## Direction contract

THESIS: Choose a tool immediately from a readable directory, without a promotional hero.

OWN-WORLD: B's indigo surfaces, restrained gold, small rectangular controls, and serif heading.

STORY: Identify the required feature, read its concrete description if needed, open it.

FIRST VIEWPORT: Brand and utilities above horizontal navigation; a modest heading and four full-width feature rows; equal entry affordances aligned right. All four tools visible at 1280 by 720 with normal text scaling.

FORM: User-selected B, the middle comparison panel. No seed key exists because the engine was unavailable; direct user selection is recorded.

FINISH: implemented; independent review findings resolved, with web validation and evidence recorded below. No generated emblem or marketing raster ships in this UI.

## Content and behavior

Use `interface-copy.md` for exact home labels and descriptions. Keep recruitment,
glamour, teleport, and gearing in the existing order. Do not add unimplemented
destinations, recent activity, counts, notifications, or character information.
The shared header provides settings, theme selection, and account actions.
Glamour and teleport replace the visible frame with the same fullscreen
authentication barrier while signed out or checking. Opening login adds the form
above that barrier; closing the barrier returns home.

Use one semantic control per feature row, with a decorative arrow inside it.
Pointer hover changes the row surface; keyboard focus outlines the entire target.
Navigation shows only the current page as selected. Do not highlight all feature
rows with gold selection bars. No repeated entrance animation.

On narrow windows, put the description below its feature name and keep the action
aligned to the trailing edge. Content may grow vertically; never clip descriptions
or hide a tool to keep the desktop viewport height.

## Implementation and review

`HomePage.tsx` and `HomePage.css` implement four whole-row buttons in the existing
order, with decorative icons and arrows. Desktop rows use an 80px minimum height;
compact rows move descriptions below titles. `AppHeader` supplies global links
with the current destination marked by `aria-current`. Header and navigation
heights are minimums and may grow with wrapping; the home viewport calculation
must not be read as a promise of a fixed total header height.

The rebuild passed 88 tests, production build, and lint. The web review covered
1280px desktop and 390px mobile in both themes, and independent review findings
were resolved (SHIP). Mobile evidence uses viewport captures. Local, uncommitted
home evidence includes `home-desktop-dark.png`,
`home-mobile-dark.png`, and `home-mobile-light.png` under
`../../.impeccable/review/`. The corrected auth evidence is
`glamour-auth-fullscreen.png` and `teleport-auth-fullscreen.png` in that directory.
Feature fixture screenshots contain synthetic data; they do not verify external
services. Native Windows bridging and authenticated actions remain unverified.
The Impeccable binary was unavailable, so no detector verdict is claimed.

DESIGN.md owns global tokens; this brief owns home composition. Font stacks use
local fallbacks, not packaged fonts. Future changes still need keyboard, wrapping,
and zoom checks rather than relying on these screenshots alone.
