# Home surface

Mode: Operate. Target: `src/pages/HomePage.tsx` and its stylesheet.
Status: approved direction B, documented for implementation; no UI migration yet.

## Scope and approval

The user selected B in the three-option comparison board and requested the final
DESIGN.md. Approval covers the principal visual language and home structure, not
the other panels or a literal pixel reproduction of generated artwork. The user's
plain-copy requirement supersedes the board's slogans and decorative theme names.

Reference: `../../.impeccable/mocks/decision/ui-language-options.png`, middle panel.
Approval record: `../../.impeccable/mocks/decision/ui-language-options.json`.

## Direction contract

THESIS: Choose a tool immediately from a readable directory, without a promotional hero.

OWN-WORLD: B's indigo surfaces, restrained gold, small rectangular controls, and serif heading.

STORY: Identify the required feature, read its concrete description if needed, open it.

FIRST VIEWPORT: Brand and utilities above horizontal navigation; a modest heading and four full-width feature rows; equal entry affordances aligned right. All four tools visible at 1280 by 720 with normal text scaling.

FORM: User-selected B, the middle comparison panel. No seed key exists because the engine was unavailable; direct user selection is recorded.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Content and behavior

Use `interface-copy.md` for exact home labels and descriptions. Keep recruitment,
glamour, teleport, and gearing in the existing order. Do not add unimplemented
destinations, recent activity, counts, notifications, or character information.
Preserve settings, theme selection, login boundaries, and feature entry behavior.

Use one semantic control per feature row, with a decorative arrow inside it.
Pointer hover changes the row surface; keyboard focus outlines the entire target.
Navigation shows only the current page as selected. Do not highlight all feature
rows with gold selection bars. No repeated entrance animation.

On narrow windows, put the description below its feature name and keep the action
aligned to the trailing edge. Content may grow vertically; never clip descriptions
or hide a tool to keep the desktop viewport height.

## Documentation boundary

This request finalizes the specification only. The FINISH block governs a later
implementation, not an unrequested build in this documentation task. Actual
rendered contrast, packaged fonts, responsive behavior, and interaction validation
remain implementation checks. DESIGN.md owns global tokens; this brief owns the
home composition and must not become another source of palette values.
