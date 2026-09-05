# Frontend organization

The frontend is organized by feature. Keep related UI, state, transport, and
domain logic together instead of adding global component or service folders.

- `app/` composes navigation, theme, authentication, diagnostics, and settings.
  Its components are the application shell, including the header and footer.
- `pages/` assembles the home, glamour, recruitment, and teleport entrypoints.
  Page components connect feature hooks to feature UI and application chrome.
- `features/auth/` owns login methods, session state, expiry events, and consent.
- `features/glamour/` owns discovery, details, equipment search, Wiki integration,
  and owned-item matching. These are parts of one workflow, not separate features.
- `features/recruit/` owns both public recruitment and advanced filtering, with
  shared configuration, party presentation, filtering, and request pacing.
- `features/teleport/` owns departure/return selection, orders, and automatic travel.
- `features/settings/` owns local-data clearing and its confirmation UI.
- `shared/` contains reusable UI, hooks, avatar loading, runtime detection, and the
  typed game bridge used by both glamour and teleport.

Within a feature, use `api/` for transport, `components/` for UI, `hooks/` for state
and effects, and `utils/` for pure logic or browser persistence. Add directories
only when needed. Keep component-private props and helpers in their component
file. Use `types.ts` for core contracts and named `*.types.ts` for larger related
contracts; defaults and validation functions belong with their feature logic.

Features may depend on `shared/` and the explicit authentication contract. They
must not import pages or the application shell. Shared modules must not depend
on features or pages. Application chrome can be used by page entrypoints without
moving feature-aware navigation into `shared/`.

Split components at complete interaction or presentation boundaries. Small
helpers stay with their owner. Recruitment card/detail presentation lives in
`RecruitEntry.tsx`; teleport automatic flow, orders, and dialogs each have a
cohesive module. Avoid one folder per button, field, or helper.

Component styles live beside their components. Broader glamour/equipment styles
live under the glamour feature. `app/styles/App.css` imports the extracted styles
in a deliberate order after existing component styles, preserving the cascade.
Keep responsive and accessibility rules with the styles they modify.

The existing Node tests remain in `tests/` and import feature utilities directly.
Use explicit `.ts` extensions in runtime imports reached by those tests. Validate
structural changes with `npm test`, `npm run build`, `npm run lint`, Prettier, and
browser checks of navigation, dialogs, themes, and responsive layouts.
