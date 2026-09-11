# Home surface

Mode: Operate. Target: `src/pages/HomePage.tsx` and `src/pages/HomePage.css`.
Status: approved direction C implemented and reviewed in Chrome.

## Scope and approval

The user approved direction C on 2026-09-11: a full-text sidebar with task-based work-area switching. The approved composition is `.impeccable/mocks/app-layout/C.png`; its durable brief is `.impeccable/mocks/app-layout/brief.md`. The concept establishes the shell and density strategy rather than requiring literal reproduction of generated pixels. Direct functional copy remains authoritative.

## Direction contract

THESIS: Choose a tool immediately from a readable, ruled directory without a promotional hero.

OWN-WORLD: Warm ivory and charcoal surfaces, restrained gold, system sans typography, and a full-text sidebar while space permits.

STORY: Identify the required feature, read its concrete description if needed, and open it.

FIRST VIEWPORT: At widths of 900px and above, a 176px sidebar anchors the shell and home uses a bounded 1280px measure. The four tools form a 2×2 ruled directory. From 620px through 899px, brand, navigation, and utilities occupy one compact top row. Below 620px, navigation becomes a second horizontally scrollable row.

FORM: Direction C from the app-layout comparison, approved by the user. Home is a directory of equal destinations rather than a card dashboard.

FINISH: Implemented and reviewed at 1440×900, 1024×700, and 720×520 with no horizontal overflow or page errors.

## Content and behavior

Use `interface-copy.md` for exact labels and descriptions. Keep recruitment, glamour, regional teleport, and gearing in the existing order. Do not add unimplemented destinations, recent activity, counts, notifications, or character information.

Each destination is one whole-row button with a feature icon, title, concrete description, and decorative trailing arrow. The 2×2 directory uses shared rules, no card shadows, and no dominant call to action. Hover changes the row surface; keyboard focus outlines the whole target. Below 768px, entries stack into one column and preserve all descriptions and actions.

The shared shell provides navigation, theme selection, settings, and truthful account actions. Glamour and teleport replace the visible frame with the established fullscreen authentication boundary while signed out or checking. Opening login adds the form above that boundary; closing it returns home.

## Implementation and review

`HomePage.css` implements the ruled grid with 132px minimum entries and its single-column translation. `foundation.css` supplies the 1280px measure and 15px base type. `navigation.css` supplies the 176px sidebar, 620–899px single-row shell, and below-620px two-row fallback.

Final Chrome evidence is `.impeccable/review/app-home-desktop.png` and `.impeccable/review/app-home-scaled.png`. The broader shell review covers gearing and recruitment; see `.impeccable/review/verification.md`. The Impeccable launcher, detector, and comp-diff each exited 1 without output, so this records manual Chrome evidence rather than an automated Impeccable verdict.

Browser evidence does not verify the native Windows game bridge, Windows font rendering, real credentials, or authenticated external operations. Those product and authentication limits remain unchanged.
