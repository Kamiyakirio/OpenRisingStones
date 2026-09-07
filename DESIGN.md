---
name: "OpenRisingStones"
description: "Design specification for the approved B direction: indigo surfaces, gold controls, horizontal navigation, and direct interface copy."
colors:
  dark-canvas: "#171E30"
  dark-surface: "#232E45"
  dark-hover: "#2B3851"
  dark-selected: "#30394A"
  dark-text: "#EEF0F7"
  dark-muted: "#B3BED2"
  dark-line: "#3A4762"
  dark-control-line: "#76859F"
  dark-accent: "#D7BD80"
  dark-accent-hover: "#E8D3A0"
  dark-on-accent: "#171E30"
  dark-disabled: "#8792A8"
  dark-success: "#8CC9AA"
  dark-warning: "#E8C27B"
  dark-danger: "#F2A39F"
  dark-info: "#AAC5F3"
  light-canvas: "#F3F4F8"
  light-surface: "#FFFFFF"
  light-hover: "#E9EDF5"
  light-selected: "#E8E3D6"
  light-text: "#202A3E"
  light-muted: "#56627A"
  light-line: "#D2D8E3"
  light-control-line: "#747D8F"
  light-accent: "#755619"
  light-accent-hover: "#5D4312"
  light-on-accent: "#FFFFFF"
  light-disabled: "#717B8E"
  light-success: "#246B4C"
  light-warning: "#795400"
  light-danger: "#AA3937"
  light-info: "#355FAD"
typography:
  headline:
    fontFamily: '"Noto Serif CJK SC", "Source Han Serif SC", "Songti SC", SimSun, serif'
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "normal"
  title:
    fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "normal"
  body:
    fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "normal"
  caption:
    fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  data:
    fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  control: "4px"
  panel: "4px"
  overlay: "8px"
  pill: "999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "10": "40px"
  "12": "48px"
components:
  button-outline-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-accent}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "40px"
  button-outline-hover-dark:
    backgroundColor: "{colors.dark-hover}"
    textColor: "{colors.dark-accent-hover}"
  button-primary-dark:
    backgroundColor: "{colors.dark-accent}"
    textColor: "{colors.dark-on-accent}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "40px"
  input-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-text}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    height: "40px"
  navigation-selected-dark:
    textColor: "{colors.dark-accent}"
    typography: "{typography.label}"
    padding: "12px 20px"
    height: "48px"
  button-outline-light:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-accent}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "40px"
  button-outline-hover-light:
    backgroundColor: "{colors.light-hover}"
    textColor: "{colors.light-accent-hover}"
  button-primary-light:
    backgroundColor: "{colors.light-accent}"
    textColor: "{colors.light-on-accent}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "40px"
  input-light:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-text}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    height: "40px"
  navigation-selected-light:
    textColor: "{colors.light-accent}"
    typography: "{typography.label}"
    padding: "12px 20px"
    height: "48px"
---

# Design System: OpenRisingStones

<!-- SEED: established with the user before implementation; re-run $impeccable document once there's code to capture the actual tokens and components. -->

## Overview

**Status: finalized design specification for the UI/UX rebuild; not yet implemented.**
The user selected option **B** from
[the comparison board](.impeccable/mocks/decision/ui-language-options.png).
This document replaces the incumbent visual system as the target for new UI work.
It does not describe the current application's rendered styles.

**Design direction: deep indigo, restrained gold, and readable working surfaces.**
Keep B's horizontal navigation, compact rectangular controls, quiet surface
layering, and a limited serif heading treatment. Its appeal comes from precise
alignment and contrast, not fantasy decoration. The discussion name “Adventurer
Journal” is not a product subtitle, a page heading, or a copywriting theme.

The board establishes the principal visual direction, not literal approval of
every generated detail. Its slogans, repeated English, invented emblem, ornamental
row markers, and image-generation artifacts are excluded. The later request for
plain copy governs all UI text. Product facts remain in [PRODUCT.md](PRODUCT.md);
the copy specification lives in [interface-copy.md](docs/design/interface-copy.md).
Home-specific composition lives in [home.md](docs/design/home.md).

**Authority:** the frontmatter defines the target color, type, spacing, radius,
and component tokens. Exact values are design decisions finalized for this rebuild,
not sampled measurements or claims about installed fonts. Unlike a minimal seed,
this record includes implementation-ready target tokens because the user explicitly
requested a new token system before rebuilding. Additional motion, breakpoint,
and elevation tokens live in [.impeccable/design.json](.impeccable/design.json).
Do not duplicate primitives there or create a competing palette in CSS.

Key characteristics:

- Indigo surfaces with tonal separation, not gradients or atmospheric glow.
- Warm gold for relevant affordances and current selection.
- Shared application navigation; workspace-specific content supplies the variety.
- Small, consistent controls with complete keyboard, pending, and error states.
- Direct copy with game terminology and no promotional introduction.

## Colors

### Primary

The accent is muted gold in dark mode and a deeper gold-brown in light mode.
Both play the same role. Do not copy the dark gold onto a white background:
it loses readable contrast. Gold is not a universal success or warning color.

### Neutral

Canvas, working surface, hover, selection, text, and secondary text have separate
roles. Dark mode is the reference presentation because the user chose B. Preserve
an explicit light-theme choice; do not infer a new default from the operating
system. In the rebuilt app, start in dark mode only when no user preference exists,
then persist the user's selection.

| Semantic CSS variable      | Dark token                 | Light token                 |
| -------------------------- | -------------------------- | --------------------------- |
| `--ors-color-canvas`       | `colors.dark-canvas`       | `colors.light-canvas`       |
| `--ors-color-surface`      | `colors.dark-surface`      | `colors.light-surface`      |
| `--ors-color-hover`        | `colors.dark-hover`        | `colors.light-hover`        |
| `--ors-color-selected`     | `colors.dark-selected`     | `colors.light-selected`     |
| `--ors-color-text`         | `colors.dark-text`         | `colors.light-text`         |
| `--ors-color-muted`        | `colors.dark-muted`        | `colors.light-muted`        |
| `--ors-color-line`         | `colors.dark-line`         | `colors.light-line`         |
| `--ors-color-control-line` | `colors.dark-control-line` | `colors.light-control-line` |
| `--ors-color-accent`       | `colors.dark-accent`       | `colors.light-accent`       |
| `--ors-color-accent-hover` | `colors.dark-accent-hover` | `colors.light-accent-hover` |
| `--ors-color-on-accent`    | `colors.dark-on-accent`    | `colors.light-on-accent`    |
| `--ors-color-disabled`     | `colors.dark-disabled`     | `colors.light-disabled`     |
| `--ors-color-success`      | `colors.dark-success`      | `colors.light-success`      |
| `--ors-color-warning`      | `colors.dark-warning`      | `colors.light-warning`      |
| `--ors-color-danger`       | `colors.dark-danger`       | `colors.light-danger`       |
| `--ors-color-info`         | `colors.dark-info`         | `colors.light-info`         |

**The boundary rule.** Use `line` for nonessential dividers. Use `control-line`
for the visible boundary of neutral inputs and controls. A quiet divider is not
strong enough to be the only way to identify an input.

**The state rule.** Pair success, warning, error, and information colors with
specific text and, when useful, an icon. Keep them on neutral surfaces; never
infer meaning solely from a hue. Selection uses `selected` plus a structural
cue such as a check, label weight, or navigation underline.

Body text, descriptions, placeholders, and functional labels must meet 4.5:1
contrast. Control boundaries and focus indicators must meet 3:1 against adjacent
surfaces. Disabled controls are not required to use readable-body contrast, but
their explanation must use normal secondary text. Do not dim entire sections.

## Typography

Use the frontmatter roles as a fixed rem scale, with a 16px reference root.
Honor browser zoom and OS text scaling; do not use viewport-scaled font sizes
for controls or data.

- **Headline:** the sole serif role, for a short top-level workspace heading.
  Use no more than one per visible workspace. Do not set paragraphs or controls
  in serif type, and do not enlarge a short label into a hero.
- **Title:** sans-serif section titles and feature names.
- **Body:** descriptions, field values, help, errors, and empty states.
- **Label:** navigation, buttons, and field labels.
- **Caption:** secondary metadata only, never the only instruction or error.
- **Data:** statistics, item levels, counts, and comparison tables; apply
  `font-variant-numeric: tabular-nums lining-nums`. Monospace is reserved for
  codes and diagnostic content, not a general visual theme.

The specified stacks are local fallbacks, not bundled assets. Prefer the named
CJK serif when available; use the declared fallback when it is not. Avoid synthetic
bold or italic. Validate Chinese glyphs and Latin brand text on Windows before
treating the typography as visually verified. Do not add a runtime font CDN
dependency. If consistent packaged fonts are introduced later, package and verify
their licensing as part of that implementation.

Use normal Chinese letter spacing and natural line breaks. Do not space Chinese
labels out to simulate an emblem, force bilingual subtitles, or insert line breaks
for poster-like headings. Keep explanatory prose at roughly 65 characters per
line; tables may be wider.

## Layout

### Application frame

Use one brand/account header followed by one horizontal application navigation
row. Keep the identity and utility positions stable across workspaces. Feature
navigation belongs below this global row, clearly subordinate to it. Do not
replace the global shell with a different brand header on every feature.

Target header height is 64px and navigation height is 48px, both minimums rather
than clipping constraints. The desktop workspace uses 32px horizontal padding,
24px vertical padding, and a centered maximum width of 1440px. Wide data views
may use the available width rather than inheriting a prose measure.

Navigation contains only implemented destinations. Local feature tabs, filters,
and toolbar actions should not masquerade as global navigation. Browser or webview
history and the current feature must agree during the eventual routing rebuild.

### Density and spacing

The frontmatter spacing scale is a 4px rhythm. Use 8px within a compact control
group, 16px between related fields, 24px between sections, and 32px between larger
regions. Use min-height and natural wrapping instead of fixed text-box heights.
Desktop controls have a 40px minimum height; coarse-pointer controls use at least
44px. Dense table rows may use a 36px minimum height, but embedded touch controls
must still meet the input-method target.

Do not give every workspace identical containers. Recruitment needs comparable
rows and filter context; glamour needs images and detail; gearing needs aligned
values and selections; teleport needs form order and trustworthy progress.
Their controls and state language share a system.

### Responsive behavior

Breakpoint values are normative in the sidecar.

- **Wide, 1200px and above:** full labels, full utility header, optional contextual
  columns when the task uses them.
- **Medium, 768px to 1199px:** reduce horizontal padding to 24px; move nonessential
  side panels below the main content before shrinking text or controls.
- **Compact, below 768px:** 16px side padding; header utilities wrap if needed.
  Keep horizontal navigation in its own keyboard-accessible scroll region;
  reveal the active destination without adding a page-wide horizontal scrollbar.
  Lists stack descriptions beneath titles and keep actions reachable.
- At 320px width and at 200% zoom, all actions and messages remain available.
  Tables that genuinely require comparison may scroll within a labeled region;
  ordinary content must reflow.

## Elevation & Depth

Depth comes primarily from the difference between canvas and surface, supported
by quiet dividers. Do not add a border and broad shadow to every container.
Only menus, popovers, and dialogs use the sidecar's elevation tokens. Their shadow
is neutral, offset, and soft; gold glow is not focus, depth, or feedback.

Portal menus and popovers out of clipping containers. Use the platform top layer
or a deliberate stacking policy. The target stacking order is base content (0),
sticky navigation (10), dropdowns (20), modal backdrop (30), modal content (40),
and toasts (50). Do not use arbitrary higher values to repair a broken parent.

Motion tokens are in the sidecar. Use brief color and surface changes for hover,
and a short transition for opening a panel. There is no animated page entrance,
continuous orbit, pulsing decoration, parallax, or delay before a task becomes
available. Under reduced motion, remove movement and make state changes immediate;
retain text progress rather than a required spinning indicator.

## Shapes

Use the small control and panel corners defined in `rounded`; overlays have
a slightly larger radius. This deliberately retains B's compact rectangular
language. Pills are reserved for small standalone tags, never navigation bars,
full-width feature rows, or forms.

Use 1px structural rules, a 2px active navigation underline, and a 2px keyboard
focus outline with 3px offset. The focus ring uses the theme's accent and must not
be clipped. Do not translate B's decorative gold row bars into a default alert
or list style.

Use the existing Phosphor icon family: regular outline for neutral UI, consistent
20px controls and 24px feature icons, with 16px icons for dense metadata.
Gold may identify a feature entry affordance, but not every decorative object.
Do not introduce heraldic emblems, compass ornaments, or new logos solely because
they appeared in generated artwork. The brand name remains OpenRisingStones.

## Components

These are target specifications, not claims that a reusable component library
already implements them. Frontmatter component entries define theme-specific
appearance; behavior below applies to both themes.

### Buttons and entry rows

Outlined gold is the normal explicit action treatment shown in B. Use a filled
accent button only when a form or dialog has one clearly dominant commitment.
Equal feature destinations remain equal; none becomes a large promotional CTA.

- **Rest:** use the matching outline or primary component tokens. An outline action
  has a 1px accent border; neutral secondary buttons use `control-line`.
- **Hover:** outline actions use `hover` and `accent-hover`; primary actions use
  `accent-hover` with `on-accent`. The label does not change.
- **Pressed:** outline actions use `selected`. Primary actions keep the hover
  fill and use an inset 1px `on-accent` line. Do not shift layout or bounce.
- **Keyboard focus:** use the shared offset outline, independently of hover.
- **Disabled:** neutral surface, `disabled` text, no accent fill or hover response,
  and actual disabled semantics. Explain an unmet prerequisite nearby.
- **Pending:** preserve width, show a specific progress label, and prevent duplicate
  submission. Error feedback belongs beside the relevant action or field.
- **Destructive:** use `danger` text and outline on a neutral surface. Name the
  data and consequence in the confirmation; gold is not a deletion cue.

An entire feature row may be one button or link. Its arrow is decorative and
must not create a second nested control. Accessible names identify the destination.
Use buttons for operations and links for real navigation.

### Fields and filters

Labels remain visible outside inputs. Placeholders are examples, not field names.
Use the input token, a 1px `control-line` border, and the shared focus outline.
Validation uses `danger` plus a complete message linked with `aria-describedby`
and invalid semantics; color alone is insufficient.

Selected filter chips use `selected`, accent text, and a check or remove action.
Unselected filters use neutral surfaces. Removing a filter must not erase unrelated
selections. “Clear filters” appears only when it resets the advertised scope.
Keep search and filter values when a request fails.

### Navigation

Unselected labels use normal secondary text. Hover raises them to normal text;
the active destination uses accent text, semibold weight, and the underline.
Use `aria-current` for destinations; actual tabs use the tab pattern, including
its keyboard behavior. Visual similarity does not make every navigation a tablist.

Keep account status truthful. Show a login action when signed out and real identity
only when available. Do not add an inert notification bell, decorative notification
dot, or a fabricated character selector.

### Lists, galleries, and tables

Use rows for comparable information, a gallery for actual image content, and a
table for statistics that need column comparison. Keep row hover and selection
distinct. A selected row is not automatically a successful operation.

Do not wrap every field in its own card. Metadata follows the content it describes.
Equipment rarity, job, and status colors remain domain meanings; do not recolor
game data gold to match the shell. Long item, server, and character names wrap or
have an accessible full-value treatment.

### Dialogs and feedback

Use overlays only for protected decisions or short focused tasks. Dialogs need
an accessible title, focus containment, a reachable cancel or close control, and
focus restoration. Do not dismiss a destructive confirmation by placing initial
focus on the destructive action.

Loading, empty results, no history, expired login, unsupported platform, stale
inventory, and request failure are different states. Use the copy specification.
Keep existing results visible during background refresh. Use polite announcements
for progress and appropriate alerts for new failures; do not repeatedly announce
a ticking countdown.

## Do's and Don'ts

### Do

- Build both themes from semantic aliases and the target tokens above.
- Keep the visible frame recognizable as B while adapting density to each task.
- Put real posts, team composition, item values, and travel state in the foreground.
- Write direct Chinese interface copy with established FF14 terminology.
- Preserve consent, local-data boundaries, and accurate failure recovery.
- Verify the implementation at desktop, compact widths, 200% zoom, and keyboard
  focus in both themes before calling it visually complete.

### Don't

- Reintroduce adventure slogans, decorative bilingual headings, or themed module
  names such as “journal” and “workbench” into the UI.
- Copy unapproved A or C palette, sidebar topology, or decorative details into
  the selected system.
- Add a marketing hero, giant icon scenes, fake activity, or invented counts.
- Paint all controls gold, make secondary text low-contrast, or turn warnings
  into anonymous colored boxes.
- Reuse old teal/green global variables as an accidental second brand.
- Treat this specification or a generated concept image as proof that the current
  UI has been implemented, tested, or migrated.
