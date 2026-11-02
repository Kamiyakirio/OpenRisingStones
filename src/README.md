# Frontend organization

The frontend is organized by feature. Keep related UI, state, transport, and
domain logic together instead of adding global component or service folders.

Tailwind CSS v4 is available through the Vite plugin in both desktop and mobile
builds. The shared entry is `shared/styles/tailwind.css`; standard utilities
such as `flex gap-4 hover:opacity-80` have no prefix. Tailwind Preflight provides
the browser baseline, and shared semantic tokens define both themes. Source
detection covers `src/` and the two HTML entrypoints. Components declare utilities
directly in JSX/TSX, including responsive, state, and arbitrary geometry variants.
There are no component or feature CSS files and no `@apply` declarations.
The shared entry contains Tailwind imports, theme configuration, browser
affordances, and keyframes. Control appearance uses native utilities on each
element; reusable class strings live in feature-local `utilityClasses.ts` modules.

- `app/` composes navigation, theme, authentication, diagnostics, and settings.
  Its components are the application shell, including the header and footer.
- `pages/` assembles feature entrypoints, including desktop tools and debug views.
  Page components connect feature hooks to feature UI and application chrome.
- `features/auth/` owns login methods, session state, expiry events, and consent.
- `features/glamour/` owns discovery, details, equipment search, Wiki integration,
  and owned-item matching. These are parts of one workflow, not separate features.
- `features/recruit/` owns both public recruitment and advanced filtering, with
  shared configuration, party presentation, filtering, and request pacing.
- `features/teleport/` owns departure/return selection, orders, and automatic travel.
- `features/gearing/` owns equipment selection, materia, stats, sharing, and native
  optimization. `editor/` keeps the cohesive editor UI, React state, calculation
  contracts, and pure equipment rules together; `benchmark/` owns debug performance
  tooling. Imported assets and generated data belong to this feature as well.
  SVG icons share one sprite. `data/generated/` is ignored and must be produced
  by `npm run gearing:data:update` before development, builds, or tests.
  The owned generator and editable input rules live under `scripts/gearing/`.
- `features/fishing/` owns catalog filtering, time/weather windows, catch sheets,
  and device-local fishing progress. Its ignored offline snapshot is in `public/data/fishing/`;
  `npm run fishing:data:update` generates it before development, builds, or tests.
  Only the importer and licenses are committed; built applications include the generated asset.
- `features/settings/` owns local-data clearing and its confirmation UI.
- `features/chat/` owns desktop and mobile message presentation, bridge state,
  channel selection, and consent.
- `features/portrait/` owns lighting controls, transport, and consent.
- `features/mentor/` owns mentor records, consent, and generated duty names.
- `features/diagnostics/` owns log inspection, grouping, and debug payload commands.
- `mobile/` composes the standalone phone UI and its browser entrypoint.
- `shared/` contains reusable UI, hooks, avatar loading, runtime detection, and the
  typed game bridge used by both glamour and teleport.
  `shared/wiki/` owns item acquisition transport, parsing, verification, and caching
  for both glamour equipment and fishing bait.

Within a feature, use `api/` for transport, `components/` for UI, `hooks/` for state
and effects, and `utils/` for pure logic or browser persistence. Add directories
only when needed; keep cohesive subfeatures such as the fishing `timer/` together.
Use `data/` for static or generated feature data. Keep component-private props
and helpers in their component file. Use `types.ts` for core contracts and named
`*.types.ts` for larger related
contracts; defaults and validation functions belong with their feature logic.

Features may depend on `shared/` and the explicit authentication contract. They
must not import pages or the application shell. Shared modules must not depend
on features or pages. Application chrome can be used by page entrypoints without
moving feature-aware navigation into `shared/`.

Split components at complete interaction or presentation boundaries. Small
helpers stay with their owner. Recruitment card/detail presentation lives in
`RecruitEntry.tsx`; teleport automatic flow, orders, and dialogs each have a
cohesive module. Avoid one folder per button, field, or helper.

Keep responsive and accessibility utilities beside the elements they modify.
Bind control sizing, padding, colors, and layout directly to each button, field,
label, table cell, or icon. Feature-local `utilityClasses.ts` constants reuse
complete utility strings without reaching into a nested component. Resolve
conflicting utilities explicitly instead of relying on class-string order. Workspace
roots own layout and theme tokens, not blanket control rules. Keep interaction
states and tightly scoped layout rules with their owning controls or immediate
containers; do not repeat `&` to override a child component. Retained semantic
class names support navigation, diagnostics, and local selectors.

Use built-in responsive, ARIA, data, and named group variants for interaction
states. Reusable components expose explicit size or layout props when their
presentation differs between callers. Keep arbitrary values for domain geometry
that has no equivalent utility; do not encode page ancestry in a control's class.
Prettier uses `prettier-plugin-tailwindcss` with the shared v4 stylesheet and sorts
classes inside JSX and `clsx`. ESLint rejects repeated `&` and blanket parent
selectors for native controls.

The Node tests and helpers use TypeScript in `tests/` and import feature utilities
directly. `npm test` checks them with `tsconfig.tests.json` before running the Node
test runner with the shared TS/JSON module loader. Use `npm run test:typecheck`
to check test types without executing the suite.
Use explicit `.ts` extensions in runtime imports reached by those tests. Validate
structural changes with `npm test`, `npm run build`, `npm run lint`, Prettier, and
browser checks of navigation, dialogs, themes, and responsive layouts.
