# App layout redesign

- Scope: the whole OpenRisingStones application, including navigation, shared controls, light/dark palettes, home, recruitment, glamour, teleport, and gearing.
- User reference: https://eorzea-weather.com/, inspected through Chrome CDP at 1440 × 900 and 1024 × 700 on 2026-09-09.
- Intent: comfortable use with macOS display scaling. Reflow and progressive disclosure take precedence over shrinking text.
- Reference qualities: narrow global navigation, bounded content measure, warm neutral surfaces, selective gold, clear separation between context, controls, and results.
- Do not copy: per-row decoration, oversized rounded containers, typography that compromises Chinese readability, or unrelated weather functionality.
- Preserve: all business behavior, authentication boundaries, data ownership, local storage, optimization semantics, equipment rarity colors, sharing, undo, cancellation, and keyboard access.
- Compare three compositions: A narrow rail with two-column editing; B single top navigation with one focused work area; C text sidebar with task-based work-area switching.
- Gearing is the density stress case, not the scope boundary. The selected shell must also serve image-led glamour, list-led recruitment, and form-led teleport.
- Preview images are illustrative design studies, not working screenshots or verified results.
- Approved direction: C, a full-text sidebar with task-based work-area switching. The user approved it on 2026-09-11.
- Responsive translation: retain the 176px text sidebar while space permits; at reduced effective widths, use one compact top bar and horizontally scrollable navigation so display scaling never squeezes the task area.
- First viewport: the active task and its primary controls remain visible without a second global header row. Gearing shows one of current equipment, candidates, comparison, or optimization at a time.
- Signature interaction: changing the local task keeps the selected slot and draft intact while replacing the work surface in place.
- No application implementation had been changed before approval.
- Tool limitation: Impeccable context, concept-seed, and build-phase commands each exited 1 without output. CDP rendering works; manual records replace unavailable launcher state.

- Revision 2: user rejected promotional copy. Regenerated all three previews using a functional UI-copy whitelist; removed slogans, invented identity, timestamps, global search, and decorative subtitles.
