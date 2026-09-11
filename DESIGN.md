---
name: "OpenRisingStones"
description: "A warm, restrained FF14 utility workspace organized around one clear task at a time."
colors:
  light-canvas: "#F5F2EB"
  light-surface: "#FCFAF6"
  light-hover: "#EEE9DF"
  light-selected: "#EEE7D7"
  light-text: "#302D28"
  light-muted: "#686158"
  light-line: "#DDD6CA"
  light-control-line: "#8A8175"
  light-accent: "#7A5816"
  light-accent-hover: "#6D5014"
  light-on-accent: "#FFFFFF"
  light-disabled: "#817A70"
  light-success: "#246B4C"
  light-warning: "#795400"
  light-danger: "#AA3937"
  light-info: "#355FAD"
  dark-canvas: "#1F1D1A"
  dark-surface: "#292621"
  dark-hover: "#353129"
  dark-selected: "#3C3424"
  dark-text: "#F2EEE6"
  dark-muted: "#C2BAAD"
  dark-line: "#494238"
  dark-control-line: "#8F8578"
  dark-accent: "#D3B36B"
  dark-accent-hover: "#E4CA8E"
  dark-on-accent: "#211D16"
  dark-disabled: "#938B80"
  dark-success: "#8CC9AA"
  dark-warning: "#E8C27B"
  dark-danger: "#F2A39F"
  dark-info: "#AAC5F3"
typography:
  headline:
    fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.5
  title:
    fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.5
  caption:
    fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.6
  data:
    fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  control: "8px"
  panel: "12px"
  overlay: "14px"
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
  button-primary-light:
    backgroundColor: "{colors.light-accent}"
    textColor: "{colors.light-on-accent}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "40px"
  button-primary-dark:
    backgroundColor: "{colors.dark-accent}"
    textColor: "{colors.dark-on-accent}"
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
  input-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-text}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    height: "40px"
  navigation-selected-light:
    backgroundColor: "{colors.light-selected}"
    textColor: "{colors.light-accent}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
    height: "48px"
  navigation-selected-dark:
    backgroundColor: "{colors.dark-selected}"
    textColor: "{colors.dark-accent}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
    height: "48px"
---

# Design System: OpenRisingStones

## Overview

**Creative North Star: “The Warm Task Ledger”**

OpenRisingStones uses the approved direction C: a quiet utility workspace with warm ivory in light mode, charcoal in dark mode, and restrained gold for focus and selection. Clear structure, readable Chinese text, and stable task context carry the identity without turning the tools into a fantasy-themed dashboard.

The shared shell keeps navigation predictable while each feature retains the layout its work requires. At desktop widths the shell is a full-text sidebar. At reduced effective widths it becomes a compact top shell. Dense features reveal one task surface at a time so display scaling does not squeeze the work area.

Product facts remain in [PRODUCT.md](PRODUCT.md), exact copy in [interface-copy.md](docs/design/interface-copy.md), and implementation evidence in [verification.md](.impeccable/review/verification.md).

Key characteristics:

- Warm ivory and charcoal surfaces with a restrained gold accent.
- System sans-serif typography, including headings.
- A 176px full-text sidebar at widths of 900px and above.
- A single-row top shell from 620px through 899px and a two-row fallback below 620px.
- A centered 1280px content measure.
- One task surface at a time when density would compromise readability.
- Direct FF14 copy without slogans, invented identity, or decorative subtitles.

## Colors

The palette is warm and low-chroma. Ivory and parchment neutrals define light mode; charcoal and warm brown-black define dark mode. Gold marks deliberate action, current location, focus, and selected state.

### Primary

- **Light Bronze** (`#7A5816`): light-theme links, selected labels, focus, and primary actions.
- **Dark Antique Gold** (`#D3B36B`): dark-theme links, selected labels, focus, and primary actions.
- Hover accents deepen to `#6D5014` in light mode and brighten to `#E4CA8E` in dark mode.

### Neutral

| Semantic role    | Light     | Dark      |
| ---------------- | --------- | --------- |
| Canvas           | `#F5F2EB` | `#1F1D1A` |
| Surface          | `#FCFAF6` | `#292621` |
| Hover            | `#EEE9DF` | `#353129` |
| Selected         | `#EEE7D7` | `#3C3424` |
| Text             | `#302D28` | `#F2EEE6` |
| Muted text       | `#686158` | `#C2BAAD` |
| Divider          | `#DDD6CA` | `#494238` |
| Control boundary | `#8A8175` | `#8F8578` |

Success, warning, danger, and information retain semantic colors. Pair them with specific text and, where useful, an icon. Equipment rarity and other game data do not inherit shell gold.

**The restrained-gold rule.** Use gold for current state, focus, and one clearly primary commitment. Equal destinations and ordinary containers remain neutral.

**The boundary rule.** Use `line` for nonessential dividers and `control-line` for functional input boundaries.

Selected sidebar text measures approximately 5.27:1 in light mode and 6.10:1 in dark mode, meeting WCAG AA for normal text. Selection also carries fill, weight, underline, or semantic current/pressed state.

## Typography

Use the local system stack: `Segoe UI`, `PingFang SC`, `Microsoft YaHei`, then `sans-serif`. Headings and controls use the same family; the design has no serif or downloaded-font dependency.

- **Headline:** 24px, 600 weight, 1.5 line height.
- **Title:** 18px, 600 weight, 1.5 line height.
- **Body and label:** 15px base size; body line height is 1.6.
- **Caption:** 13px with 1.6 line height for supporting metadata and state.
- **Data:** 15px with `tabular-nums lining-nums` where alignment matters.

Honor browser zoom and OS text scaling. Use natural Chinese line breaks and normal letter spacing. Do not add bilingual ornaments or viewport-scaled type. Windows glyph rendering still requires native verification.

## Layout

At widths of 900px and above, use a sticky 176px full-height sidebar and flexible workspace. The sidebar contains brand, full-text destinations, theme and settings controls, and truthful account entry. Main content is centered at `min(1280px, 100%)` with 32px padding; padding reduces below 1200px and 768px.

From 620px through 899px, brand, horizontally scrollable text navigation, and compact utilities share one sticky top row. Below 620px, brand and utilities remain on the first row while navigation moves to a second scrollable row. Wide layouts keep the sidebar and never stack top navigation.

Use the 4px spacing rhythm. Controls have a 40px global minimum and at least 44px for coarse pointers. Dense gearing controls may use 36px with coarse-pointer overrides.

The home is a ruled 2×2 directory with four equal whole-row targets and 132px minimum entries. Below 768px it becomes one column. No destination becomes a promotional card.

Preserve one task surface at a time when simultaneous panes would compete for effective width. Gearing switches among current equipment, candidates, statistics/comparison, and optimization while preserving selected slot and draft. Local tables may scroll; the page must not overflow horizontally.

## Elevation & Depth

Depth comes from canvas/surface contrast and quiet rules. Resting content is flat. Menus and dialogs alone use the warm, neutral shadows in the sidecar. Focus uses an outline rather than glow.

The fullscreen authentication boundary covers the shell for protected glamour and teleport states. `LoginDialog` opens above it; focus containment, scroll locking, restoration, and innermost Escape handling remain requirements.

Motion is limited to 120ms feedback and 180ms small-panel changes. Remove movement under reduced-motion preferences.

## Shapes

Controls use 8px corners, panels 12px, and overlays 14px. Pills are reserved for compact standalone tags. Home directory entries and tab underlines use square structural edges.

Use 1px rules, a 2px active underline in top-shell navigation, and a 2px focus outline with 2–3px offset. Continue the Phosphor outline icon family. Do not introduce heraldic marks, generated emblems, ornamental rails, or unrelated weather motifs.

## Components

### Navigation

At 900px and above, navigation is a 176px full-text sidebar with 48px targets, muted default text, neutral hover fill, and selected fill plus gold text. At 620–899px it shares one top row; below 620px it occupies the second row. Use `aria-current="page"`, keep the active destination visible, and preserve keyboard focus.

### Buttons and fields

Primary buttons use accent fill and on-accent text. Secondary controls use neutral surfaces and control-line borders. Disabled controls remain identifiable and prevent duplicate action. Visible labels sit outside fields; validation uses complete messages and invalid semantics in addition to danger color.

### Home directory

Keep recruitment, glamour, regional teleport, and gearing as equal whole-row buttons. Each has one icon, direct title, concrete description, and decorative trailing arrow. Shared rules define the 2×2 layout; compact widths stack it to one column.

### Task surfaces

Feature layouts retain their information model: comparable rows for recruitment, images for glamour, ordered form state for teleport, and aligned equipment/stat data for gearing. Task switching must preserve user context.

### Authentication and dialogs

Signed-out or checking glamour and teleport states share the fullscreen `AuthenticationGate`. Closing it returns home. Login opens above it, and Escape closes the innermost layer first. Account controls show real profile data only when available.

## Do's and Don'ts

### Do

- **Do** build both themes from semantic aliases in `tokens.css`.
- **Do** preserve the 176px sidebar and its responsive top-shell translations.
- **Do** preserve the 1280px measure, 15px base type, and 13px captions.
- **Do** keep one task surface visible when density would squeeze content.
- **Do** preserve keyboard access, authentication boundaries, local data ownership, optimization semantics, undo, cancellation, and accurate recovery.
- **Do** write direct Chinese UI copy with established FF14 terminology.

### Don't

- **Don't** restore the superseded palette or use stacked top navigation on wide layouts.
- **Don't** add promotional heroes, slogans, decorative bilingual subtitles, or invented identity.
- **Don't** turn each home destination or field into a floating card.
- **Don't** use gold as a generic success, warning, rarity, or decoration color.
- **Don't** shrink text to fit display scaling or allow ordinary page overflow.
- **Don't** treat generated concepts or browser fixtures as proof of native bridging or authenticated operations.
