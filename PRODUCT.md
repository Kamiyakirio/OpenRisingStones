# OpenRisingStones

<!-- impeccable:product-schema 1 -->

## Platform

web

The interface uses React, TypeScript, and Vite inside a Tauri desktop application.
Here, `web` describes its UI technology and design language; the product is a
desktop tool, not a browser-only service or an OS-native mobile application.

## Users

FF14 players who use desktop tools alongside their game activities. The product
audience is not restricted to players of a particular regional edition.

## Product Purpose

An unofficial desktop toolkit offering a variety of useful functions for FF14
players. Its scope can grow beyond the functions currently implemented.

## Positioning

OpenRisingStones brings multiple FF14 utilities into one desktop application.
It is a community tool, not an official game service. No exclusive capability,
comparative performance claim, or official endorsement has been established.

## Operating Context

Players enter individual workspaces from the application home. Some functions
depend on external services, authentication, or a running game, while others use
locally generated game data. Audience scope does not imply that every function
supports every region or operating system.

## Capabilities and Constraints

The following inventory reflects the existing repository, not a permanent limit
on product scope:

- Recruitment browsing and filtering using Rising Stones recruitment data.
- Glamour discovery, equipment lookup, and owned or equivalent-model item matching.
- Regional teleport workflows, including destination selection and orders.
- Gear-set planning, materia selection, statistics, optimization, and share codes.
- Authentication, light and dark themes, and local-data clearing.

Game-process bridging supports Windows only. Preserve explicit user consent for
process injection and the existing version-validation gates. A desktop build on
another operating system does not imply support for these bridge capabilities.

The current implementation encrypts the local owned-item index using keys derived
from an authenticated game-login session. Preserve the distinction between cached,
potentially stale, unavailable, and empty inventory data.

## Brand Commitments

The confirmed product name is **OpenRisingStones**. The current homepage's singular
`OpenRisingStone` spelling is an implementation inconsistency, not a second brand.
Preserve the product's unofficial status. No additional binding visual or voice
requirements were established during initialization.

## Evidence on Hand

- `README.md`: desktop product overview, development, data generation, and packaging.
- `src/pages/HomePage.tsx`: current workspace entrypoints and product copy.
- `src/README.md`: feature ownership and frontend organization.
- `game-bridge/README.md`: Windows bridge, validation gates, inventory semantics,
  and local encryption behavior.
- `src-tauri/tauri.conf.json`: desktop packaging identity and webview configuration.
- `docs/ffxiv-gearing-integration.md` and `docs/ffxiv-gearing-migration.md`:
  gear-planning integration evidence and constraints.

These sources establish current implementation context. They do not establish
universal regional compatibility, production reliability, or user adoption.

## Product Principles

- Support useful FF14 player workflows within one desktop toolkit.
- Allow the toolkit to expand beyond its current feature inventory.
- Make platform, service, authentication, and game-state dependencies explicit.
- Preserve informed consent and clear handling of locally stored player data.

## Open Decisions

No additional audience restrictions or long-term product boundaries were requested.
Feature-level regional coverage, accessibility targets, and measurable success
criteria have not been established as durable product requirements.
