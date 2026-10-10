# Application redesign

Primary target: `src/app/components/AppView.tsx`.
Related targets: all feature workspaces, dialogs, the fishing timer, and mobile chat.
Mode: operate. Build path: code.

## Direction contract

THESIS: A familiar multi-tool application with Discord-informed navigation and
interaction density. Muted tool identity lives in selected navigation and workspace icons, home symbols, primary actions, focus, and quiet selection fills. Headings and workspace bars stay neutral. Real tasks remain primary; tool identity uses color without
turning workspaces into decorative dashboards.

OWN-WORLD: Milk-white canvas and white surfaces in light mode; matte-black canvas
and neutral-black panels in dark mode. Muted blue, teal, violet, pink, and orange identify
tools. Full, contrasting outlines frame controls and selections; structural dividers are quieter. Compact sans
text, 8px controls, 12px panels, restrained motion, no gradients or glow.

STORY: Choose a tool from grouped navigation or searchable home entries, keep
context in the workspace header, then filter, inspect, or act. Preserve content,
authentication, process consent, saved plans, and domain-specific semantics.

FIRST VIEWPORT: A 232px text sidebar, a 56px workspace bar, and a flexible work
area. Home puts searchable tool rows on the left and actual account/PvP context
on the right, with 20px page gutters and a 16px column gap; compact widths stack them and use horizontal tool navigation.

FORM: The user chose the familiar application canon over the assigned catalog
direction (seed `5fe41be2`), then named Discord as an interaction reference.
Signature interaction: tool selection updates workspace context and accent
together; home search narrows destinations without changing their actions.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
