---
name: OpenRisingStones
description: A familiar application workspace for FF14 tools.
colors:
  light-canvas: "#fcfcfa"
  light-surface: "#ffffff"
  light-hover: "#eeeff3"
  light-selected: "#eef0f5"
  light-text: "#202127"
  light-muted: "#596170"
  light-line: "#c7cbd3"
  light-control-line: "#808896"
  light-accent: "#53618a"
  light-accent-hover: "#435074"
  light-on-accent: "#ffffff"
  light-disabled: "#687183"
  light-success: "#187552"
  light-warning: "#9b580c"
  light-danger: "#bf3548"
  light-info: "#4a6d91"
  light-violet: "#716184"
  light-pink: "#865e76"
  light-teal: "#466f73"
  light-orange: "#86684c"
  dark-canvas: "#0e0e10"
  dark-surface: "#18191d"
  dark-hover: "#26282f"
  dark-selected: "#2a2d36"
  dark-text: "#f2f3f5"
  dark-muted: "#b0b6c3"
  dark-line: "#383b43"
  dark-control-line: "#778094"
  dark-accent: "#a0aacb"
  dark-accent-hover: "#b6bfd8"
  dark-on-accent: "#101128"
  dark-disabled: "#9aa2b2"
  dark-success: "#70d4a4"
  dark-warning: "#efba72"
  dark-danger: "#ff94a5"
  dark-info: "#9bafc8"
  dark-violet: "#b2a3c5"
  dark-pink: "#c2a0b2"
  dark-teal: "#91b6b8"
  dark-orange: "#c7ad90"
typography:
  headline:
    fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "24px"
    fontWeight: 700
    lineHeight: "32px"
    letterSpacing: "-0.025em"
  title:
    fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "18px"
    fontWeight: 600
    lineHeight: "28px"
  item-title:
    fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "16px"
    fontWeight: 600
    lineHeight: "24px"
  body:
    fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.625
  control:
    fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "20px"
  label:
    fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "16px"
  technical-input:
    fontFamily: '"Cascadia Mono", "SFMono-Regular", Consolas, monospace'
    fontSize: "12px"
    lineHeight: 1.6
rounded:
  control: "8px"
  panel: "12px"
  overlay: "16px"
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
  button-primary:
    backgroundColor: "{colors.light-accent}"
    textColor: "{colors.light-on-accent}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
  button-primary-hover:
    backgroundColor: "{colors.light-accent-hover}"
  button-primary-dark:
    backgroundColor: "{colors.dark-accent}"
    textColor: "{colors.dark-on-accent}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
  button-secondary:
    textColor: "{colors.light-accent}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    typography: "{typography.control}"
  search-field:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-text}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "44px"
  navigation-item:
    textColor: "{colors.light-muted}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    typography: "{typography.control}"
  context-panel:
    backgroundColor: "{colors.light-surface}"
    rounded: "{rounded.panel}"
    padding: "{spacing.4}"
  tool-row:
    textColor: "{colors.light-text}"
    padding: "12px 16px"
  dialog:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-text}"
    rounded: "{rounded.overlay}"
---

# Design System: OpenRisingStones

## Overview

**Creative North Star: "A familiar multi-tool application"**

OpenRisingStones uses a familiar application layout for choosing and operating FF14 tools. Discord informs navigation and density: grouped destinations, persistent workspace context, compact controls, and direct task content. The identity comes from neutral surfaces, clear outlines, and a consistent relationship between each tool and its accent.

Light mode pairs a milk-white canvas with white panels; dark mode pairs a matte-black canvas with neutral dark panels. Both share the same hierarchy and geometry. Actual game imagery belongs to its content; interface decoration does not introduce gradients, glow, or a simulated physical material.

**Key Characteristics:**

- Grouped application navigation and persistent workspace context.
- Compact sans typography with readable task density.
- Milk-white and matte-black grounds with contrasting full outlines.
- Muted tool accents, restrained motion, and explicit action states.

## Colors

The palette keeps the working surface neutral while tool identity and action states carry color. The frontmatter records the base light and dark values implemented by `src/shared/styles/tailwind.css`, the application theme utilities, and the HTML entrypoint theme utilities. Theme pairs share the same suffix. Components shown with light-mode primitives take their corresponding dark-mode values through the live CSS custom properties. Workspace role bindings in `src/shared/styles/workspaceColors.ts` remap action, hover, focus and selection to the current tool. Selected fills mix 6% tool color with the light surface or 10% with the dark surface; soft tool and semantic fills mix 10% with the surface. These computed workspace values replace the base indigo selection/hover values. Cyan and orange light primitives are deep enough for small text on soft fills.

### Primary

- **Application indigo:** `light-accent` / `dark-accent` remain the brand, home and chat color. Every other tool uses its own hue for primary actions, focus and selection; dark actions use the existing deep on-accent foreground. Brand identity remains independent of the active tool.

### Secondary

- **Tool violet:** recruitment and portrait assistance.
- **Tool pink:** glamour discovery.
- **Tool teal:** teleport and mentor records.
- **Tool orange:** gearing, its benchmark and developer diagnostics.
- **Tool blue:** fishing uses the info pair.

### Tertiary

- **Success, warning, danger, and info:** feedback, notices, failures, and connection state. Use the appropriate theme pair with visible explanatory text; these roles do not redefine a tool's identity.

Recruitment party slots retain job images, role labels and solid/dashed occupancy outlines. Tank labels and outlines are blue, healer labels green and damage labels red; filled slots receive the corresponding soft surface. Color reinforces role and never substitutes for the slot name or occupancy indication.

### Neutral

- **Canvas and surface:** application ground and contained workspace panels.
- **Hover and selected:** quiet interaction fills and selected content.
- **Text, muted, and disabled:** primary copy, supporting information, and unavailable controls.
- **Line and control-line:** structural dividers and stronger control outlines.

Home tool symbols mix their assigned accent into the surface (4%) and line (18%) in sRGB. These are derived component treatments, not additional primitive colors. Desktop theme selection overrides the operating system; standalone mobile chat follows the operating system through `prefers-color-scheme`.

Game chat badges retain their channel colors and contrast foregrounds in both themes. Mentor chart categories remain distinct data series. Login QR frames keep a light scan ground, and pairing QR artwork keeps its required white ground. These are domain-specific exceptions, not alternative application palettes.

**The Tool Identity Rule.** A tool keeps its muted accent in the selected navigation icon, its home symbol, workspace icon, and primary actions; color does not replace labels or action meaning.

**The Full Outline Rule.** Use the surface-line token for panels and dividers, the control-line token for fields and outlined controls, and a control-line outline with a quiet selected fill for selected navigation.

## Typography

**UI Font:** Segoe UI, with PingFang SC, Microsoft YaHei, and sans-serif fallbacks.

**Technical Input Font:** Cascadia Mono, with SFMono-Regular, Consolas, and monospace fallbacks for raw session and technical text entry.

The interface uses a single compact UI sans family for headings, navigation, forms, and body copy. The frontmatter captures reused roles rather than every domain-specific size; there is no separate display role.

### Hierarchy

- **Headline:** home page heading, bold with tight tracking.
- **Title:** workspace sections and dialog headings.
- **Item title:** tool names and contextual panel titles.
- **Body:** application-root reading text with relaxed leading.
- **Control:** navigation, search, and ordinary control text; emphasized states increase weight.
- **Label:** group labels, metadata, and concise supporting information.
- **Technical input:** raw text entry in login forms.

Mobile chat has a compact header, smaller timestamp metadata, and readable wrapped message text. Numeric countdowns and chat timestamps use tabular numerals. Do not promote the mobile metadata sizes into a general body-text scale.

**The Application Type Rule.** Headings and controls use the same UI sans family. Establish hierarchy with size and weight rather than an added display face.

## Layout

The desktop shell uses a fixed text sidebar (232px), a flexible workspace column, and a sticky workspace bar (56px). Sidebar identity, grouped navigation, and bottom account/theme/settings controls share one full-height column. Navigation scrolls independently when needed.

At widths below 900px, the shell becomes a vertical document: application identity and compact actions occupy the top row, tool navigation becomes horizontally scrollable, and the workspace bar becomes static (48px). Below 520px, navigation labels and icons become smaller. The base document supports widths from 320px.

Home has a bounded content width (1600px), desktop horizontal padding (20px) and a 16px column gap, and tool rows beside a context column (320px). Below 1200px the context column narrows (280px); below 1100px it moves under the tools. The context area and PvP entries can share horizontal space until below 620px, when they stack. The search also expands to full width at that compact breakpoint. Horizontal padding drops to 16px below 900px and 12px below 520px.

The spacing tokens use a 4px rhythm. Common gaps are 8px, 12px, 16px, 20px, and 24px; direct JSX/TSX utilities retain geometry required by tables, equipment slots, charts, editors, and scrolling ledgers. Arbitrary values and variants express specialized grids, anchor positioning, and state-dependent dimensions. The shared CSS entry contains Tailwind configuration and animation keyframes only.

Ordinary desktop controls have a shared minimum height (36px); coarse-pointer controls rise to 44px. Header icon actions and dialog close buttons also preserve a 44px minimum width under coarse pointers. Header identity can truncate when space is limited, while icon actions retain accessible names. Sidebar destinations and home search already use 44px targets. Home destination rows use a minimum height of 64px, 12px by 16px padding, and 36px symbols; real text determines the final row height.

Standalone mobile chat is a viewport-height grid with separate header, status notice, filter area, scrolling ledger, and composer in normal grid flow. Safe-area insets contribute to the top and bottom padding. At 46rem and wider, its maximum-width shell becomes a bordered, rounded panel with 1rem outer vertical margins. When viewport height is at most 32rem, the shell uses automatic height and intrinsic grid rows with document scrolling; its ledger is capped at 40dvh, so controls cannot collapse or clip the composer. Chat popovers adapt below 768px; login and settings dialogs adapt at 700px, retain internal scrolling, and remain within the viewport.

Glamour detail and its loading skeleton choose one or two fluid columns from their own content container, with two columns from 980px of available content width. Advanced recruitment's primary filters use two fluid columns from 780px of workbench width. These thresholds account for the application sidebar and page gutters instead of assuming viewport width equals usable workspace width.

Glamour detail owns a 1480px maximum page width with 20px horizontal gutters, reduced to 16px below 900px and 12px below 520px. Its navigation, content, and detail-specific attribution share those edges. Media and information align at the top with 20px between sections. In single-column mode, the main image explicitly fills the media width and uses a 4:5 frame capped at 720px high. In two-column mode, the media column stretches to match the information column; the image fills the remaining height above the horizontal thumbnail strip. A single image shares the information column's top and bottom edges. Equipment columns respond to the information container: one column below 480px and two columns from 480px. Each slot fills its grid row and aligns its icon and copy at the top, so empty and populated slots keep matching row edges. The loading layout shares the final content grid and image-frame geometry.

The independent fishing timer stacks its title bar and content at every window width. Narrow gearing action groups wrap in their existing task order; the context summary keeps its title and data version intact while its descriptive middle can truncate. Gearing candidates use a 320px equipment column only from 1200px viewport width; narrower workspaces show candidates directly, with a return action and slot selector. Candidate context and filter feedback align to 12px toolbar insets, wrap their actions, and keep the table within a bounded scrolling region. The desktop candidate workspace reserves space for the command bar and context above it. Equipped names, materia, and effective stats occupy separate rows; the parent owns padding, and each stat label/value stays together when wrapping. Unsaved-plan dialogs scroll vertically for long content or short windows. Narrow authentication, footer, mentor-detail, portrait-panel, and diagnostic-list spacing overrides retain the specificity of their desktop rules. Benchmark gutters match the page inset, and its form chooses non-overlapping one-, two-, or four-column ranges. The browser-only debug view renders its runtime error and log fallback rather than allowing a synchronous native guard to unmount the application.

## Elevation & Depth

**The Flat Surface Rule.** Routine workspaces and home panels use borders and tonal separation. Reserve soft depth for temporary overlays; do not add decorative glow.

The shared static theme and explicit theme utilities provide the light and dark popover and dialog shadows recorded in the sidecar. Current login and settings dialogs primarily use a full control outline and a dim backdrop (`rgba(10, 15, 26, 0.64)`). The chat-filter popup carries a local soft shadow (`0 8px 24px #302d2826`); it is an observed implementation exception, not a replacement shadow scale. Account popovers use an outlined surface. Do not assume every overlay applies the shared shadow token.

Buttons transition color and border feedback over 120ms. The token source also exposes 180ms panel timing and a standard easing curve; feature motion may use its existing local timing. A spinner marks pending operations. The shared reduced-motion rule reduces animations and transitions to 0.01ms, limits animations to one iteration, and restores automatic scrolling.

## Shapes

Controls use gently rounded corners (8px), ordinary panels use wider corners (12px), and dialogs use overlay corners (16px). The existing pill radius supports chips and rounded badges; its presence does not make every control pill-shaped. Panel separators and form boundaries are thin full strokes (typically 1px). Tool symbols combine an outlined rounded container with a vector icon. Data visualizations and game content keep their domain-specific silhouettes.

Keyboard focus uses an accent outline (2px) offset from the control (3px); bounded tool rows move the outline inward to avoid clipping. Specialized chat controls use their own 2px offset. Focus is visible in both themes.

## Components

### Buttons

Workspace bars and home tool names use neutral text and surfaces. Selected navigation and workspace icons, home tool symbols, primary actions, and equipment section headings carry the muted tool color. Authentication icons identify the protected tool; its panel outline stays neutral. Shared login/settings headings use a soft tool fill; risk explanations and phone connection notices use semantic soft fills with text and icons.

Primary actions use the accent fill, matching on-accent text, accent border, and control radius. Mobile send buttons use 8px by 12px padding; login primary buttons use a minimum height of 46px and 18px horizontal padding. Hover uses the established accent treatment. Secondary account actions keep a full outline with accent text and neutral hover fill. Header actions use transparent borders at rest and a quiet hover fill. Unavailable actions retain disabled semantics and visible reduced emphasis.

### Chips

Chat channel badges are compact semantic tags, with 1px by 6px padding and small text. Their channel colors stay independent of tool accents; novice tags use white text, while the other observed channel tags use black text. Keep the channel label visible.

### Cards / Containers

Home context panels use the panel radius, surface fill, structural outline, and 20px padding. The destination directory is one outlined panel with bordered rows, rather than a collection of floating cards. Routine panels do not need shadows.

Recruitment cards keep identity, facts, and party composition in independently sized, top-aligned groups. They use one column below 768px, two columns from 768px, and three columns from 1200px; the footer spans the full card width. Loading placeholders follow the same columns, padding, and footer span without an interactive cursor or a fixed 430px minimum height. Compact party slots stay 56px tall rather than stretching to match adjacent text. Their grid uses four columns below 640px and eight columns from 640px. Expanded detail slots retain job names and a minimum height of 100px, using two, four, and eight columns at the existing detail breakpoints (480px and 1120px). These are recruitment-specific data geometry, not general card heights. Recruitment card labels keep a full structural outline and canvas fill at their existing 28px minimum height, so they remain distinct when the surrounding card takes its hover fill.

### Inputs / Fields

Search is a 44px outlined surface with an inline vector icon and a transparent inner input. Focus within changes its full outline to the accent. Forms use the control outline, surface or canvas fill according to context, and control radius. Placeholder text uses muted foreground. Errors and warnings remain explicit text with their semantic colors. Mobile recipient/select fields use 44px minimum targets; the message textarea retains resizing and wrapped content.

Recruitment checkbox indicators remain square (16px by 16px), with no inherited minimum height or padding. Their associated labels carry the interaction target: at least 36px tall on desktop and 44px with coarse pointers. Preserve this distinction between the visible indicator and its clickable label when extending recruitment preferences and filters.

### Navigation

Grouped sidebar destinations combine an icon with a text label. Resting text is muted; hover moves to a neutral fill and primary foreground. The current destination keeps `aria-current="page"`, stronger text, and a full outline in its tool accent. On compact screens the same destinations become horizontal and automatically scroll the selected item into view. Header actions retain accessible names when visible labels are hidden.

### Tool Directory

Each row contains the assigned accent icon container, tool title, short description, and directional icon. Search filters actual destinations and supplies a clear empty state. Selecting a row opens the corresponding tool; it does not substitute demonstration content for the workflow.

### Teleport Workspace

The form and route preview share aligned top and bottom borders at desktop widths. The builder stretches both panels; neither panel scrolls independently. Both headings use the same 28px line box and padding, with 20px desktop and 16px phone insets. Consent and submission stay at the form bottom, while the route explanation anchors the preview bottom.

The split depends on available workspace width (900px), not the viewport. Form fields become two columns when the form itself has 480px available. Order rows change composition at workspace widths of 600px and 1050px; long identifiers wrap without compressing route names. Controls use a 44px minimum height, including dialog actions. Empty histories use a centered stack, and failed initial requests display unavailable summary values rather than misleading zeros. Busy dialogs retain keyboard focus and short screens scroll to reach all actions.

### Dialogs and Mobile Chat

Dialogs pair a neutral surface and full outline with a dim backdrop, a labeled title, an explicit close action, and scrollable content. Authentication risks and confirmations remain part of the existing interaction. The chat ledger separates channel, sender, timestamp, and message. A development-only phone preview is visibly marked as a demonstration, has a distinct simulated connection state, and cannot send or disconnect through real requests.

## Do's and Don'ts

### Do:

- **Do** use the shared theme tokens for new surfaces and controls.
- **Do** preserve visible full borders and keyboard focus.
- **Do** keep tool accents consistent with the existing feature mapping.
- **Do** distinguish real connection states, demonstrations, errors, and disabled actions in visible text.
- **Do** express both domain geometry and shared visual primitives through direct JSX/TSX utilities.
- **Do** preserve semantic game channel colors, chart category distinctions, and readable QR grounds.

### Don't:

- **Don't** introduce gradients, glow, or decorative physical textures into the application chrome.
- **Don't** use accent color as the only indicator of selection, status, or consent.
- **Don't** add a separate display font or inflate ordinary tool screens into promotional layouts.
- **Don't** issue requests from the development phone demonstration or present synthetic messages as a paired session.
- **Don't** use a Tailwind prefix or @apply; the project uses standard Tailwind v4 utilities and Preflight.
