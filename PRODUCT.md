# OpenRisingStones

<!-- impeccable:product-schema 1 -->

## Platform

web

Repository evidence: React and TypeScript provide the interface, Vite builds it,
and Tauri hosts the desktop application. A separate mobile web entry serves the
phone chat client. This describes the implementation, not a newly agreed platform
support commitment.

## Users

FF14 players.

## Product Purpose

Provide a toolkit for FF14 players.

## Operating Context

The current implementation groups tools into feature workspaces. Some workflows
use remote services or a running game; others use locally generated game data.
The phone chat client connects to the desktop application's chat service.

## Capabilities and Constraints

The following is an implementation inventory supported by repository evidence,
not a fixed long-term product boundary:

- Recruitment browsing and filtering.
- Glamour discovery, equipment lookup, and owned-item matching.
- Regional teleport workflows.
- Gear planning, materia, statistics, optimization, and sharing.
- Fishing lookup, conditions and windows, timers, and local catch records.
- Portrait editing assistance.
- Mentor records and analysis.
- Desktop chat and a mobile web chat client.
- Authentication, themes, local-data management, and daily check-in.

The user specified no additional long-term product constraints during this
initialization. This does not remove existing implementation requirements,
authorization checks, data handling, or repository instructions.

## Evidence on Hand

- `README.md`: application overview, development, data generation, and packaging.
- `src/README.md`: implemented feature ownership and desktop/mobile boundaries.
- `package.json`: existing stack and development commands.
- `src-tauri/tauri.conf.json`: desktop host and development entry.
- `docs/chat-bridge.md`: desktop/mobile chat operation and pairing.
- `docs/fishing-database.md`: fishing features and data limitations.

Repository evidence establishes the current implementation. It does not establish
user adoption, measured benefits, or universal regional and platform support.

## Brand Commitments

The user chose a familiar application layout and named Discord as a design
reference. The confirmed palette is milk-white in light mode and matte black in
dark mode, with multiple accent colors and contrasting borders. This is a new
design commitment; retired visual decisions must not be restored.

## Open Decisions

Specific player segments, priority workflows, success metrics, regional coverage,
and product-specific accessibility targets have not been specified. Future work
should not invent them or restore retired product and design assumptions.
