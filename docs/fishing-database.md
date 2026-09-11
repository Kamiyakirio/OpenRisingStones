# Fishing database

The first workflow is available from the home directory and `#fishing`, without
authentication: search/filter fish, open a catch sheet, then save a target or mark
it caught. Returning to the list preserves its filters, page, and scroll position.
Progress uses `ors.fishing.progress.v1` in local storage and is removed by the
existing clear-local-data action. Progress is device-local, not character-specific.

## Reference findings

- [FF14 Fish Tracker](https://github.com/icykoneko/ff14-fish-tracker-app) is a static
  application. Its Python pipeline combines game sheets with maintained catch
  rules in `private/fishData.yaml`. `js/app/data.js` provides time, preceding and
  current weather, bait/mooch chains, intuition prey, and spot/weather references.
  `fish_info_data.js` contains a broader ordinary-fish guide. The MIT license is
  preserved in `licenses/ff14-fish-tracker-app/LICENSE`.
- [Fish Momola](https://fish.ffmomola.com/) serves a client application with
  separate modules for fishing, bait, quests, achievements, collectables, Diadem,
  and cosmic exploration. Its public entrypoint and delivered module names were
  inspected. These indicate feature boundaries, not access to its backend or
  unpublished source. No proprietary dataset or application code was copied.
- [Eorzea Weather](https://eorzea-weather.com/) describes weather prediction, big
  fish windows, catch tracking, sightseeing, and ocean routes. Its delivered
  assets separate weather, big fish, sightseeing, and gathering data. These are
  references for later expansion; this feature does not implement those modules.

## Data and updating

Run `npm run fishing:data:update`. The importer downloads the MIT tracker's guide
and conditions plus Chinese `Item`, `PlaceName`, `Weather`, `FishingSpot`,
`SpearfishingNotebook`, `FishingNoteInfo`, `IKDSpot`, `FishParameter`,
`SpearfishingItem`, `GatheringPointBase`, `GatheringItemLevelConvertTable`, and
`TerritoryType` sheets from
[thewakingsands/ffxiv-datamining-cn](https://github.com/thewakingsands/ffxiv-datamining-cn).
It joins records by game IDs, preserves multiple ordinary fishing spots, and
writes the compact `public/data/fishing/catalog.json` snapshot. Every input URL
and SHA-256 digest is recorded in that snapshot. Upstream branches are mutable;
updates are explicit. Generated files are ignored by Git and included in build
artifacts. Development, build, and test preflight checks require a valid local
catalog and print the generation command when it is missing. Game texts and
graphics remain the property of SQUARE ENIX.

The snapshot contains 1,810 unique fish. Visible rod/spear game-log rows define
coverage; the tracker alone previously omitted 86 ordinary spear fish. A minimum
of 1,730 unique records is checked by the importer and regression suite. The
tracker supplies 1,110 detailed catch
records. Explicit game-note restriction flags and
[Teamcraft fishing sources](https://github.com/ffxiv-teamcraft/ffxiv-teamcraft/blob/staging/libs/data/src/lib/json/fishing-sources.json)
fill ordinary-fish rules and bait, while preserving null for genuinely unknown
fields. All 1,551 rod/spear records now support time/weather eligibility; the other
259 records belong to ocean voyages. Empty weather arrays mean unrestricted,
whereas null means unknown. Teamcraft's MIT license is included separately.
This merges visible game-log entries with tracker records, not a claim of future-patch completeness.
Chinese names fall back to upstream English when unavailable. The upstream
`bigFish` flag is enriched by Teamcraft's `legendary-fish.json`; `item-patch.json`
fills ordinary-fish release versions. Ocean rarity 2 and 3 identifies rare and
legendary ocean fish. Unclassified guide entries and unknown conditions are
explicit. Aquarium information is available only where supplied by the tracker.

The catalog ships with the app and needs no external service to search or track
progress. Fish and weather icons use XIVAPI; failures keep weather names visible
and use a Phosphor fallback. Weather icon IDs come from the game Weather sheet.
Both the list and detail expose catch requirements. The detail also forecasts
the selected fishing location's previous, current, and next two weather periods.
The two closed-source sites are external references only.

## Timing semantics

One Eorzean hour is 175 real seconds. Weather changes every eight Eorzean hours;
the preceding weather is looked up one full weather period earlier. Current
eligibility checks time and both weather sets. Future windows intersect actual
time and weather boundaries, stopping after ten complete windows by default.
The initial search horizon is one real year; extending results adds ten windows
and another year of search. Empty searches can also extend their horizon. Intervals include
their start and exclude their end, preserve fractional hours, and merge contiguous
eligible segments. The current window begins at the current display time.

Window eligibility does **not** establish fish intuition, quest completion,
gathering stats, mooch availability, or a successful catch. The Fish Eyes toggle
ignores time only for explicitly eligible rod fish and preserves both weather
requirements. It is a planning mode, not a claim that the character has the buff.
See the official [Fisher action guide](https://na.finalfantasyxiv.com/crafting_gathering_guide/fisher/).
Spearfishing uses the same time/weather calculation as rod fishing; its prey
requirements remain separate. Ocean fishing uses voyage state rather than the
world forecast. `IKDSpot` links spectral fishing spots to the spectral-current
weather icon (Weather 145). Known bait, prey, and weather properties are displayed,
but player-triggered spectral currents cannot receive a guaranteed wall-clock
start time. Exact ocean voyage time-of-day rules are not yet imported. Unknown
ocean weather sets remain explicit, not silently unrestricted. Alarms,
game-character sync, and ocean route scheduling remain future work.

## List and detail behavior

Independent multi-select facets cover patch families, world/ocean, fish kind,
time/weather restrictions, completion, and rod/spear. Region, saved targets,
aquarium, collectables, and current eligibility narrow them further. The default
sort prioritizes open-window expiry, then future opening, unrestricted fish, and
unforecastable fish. Name, descending release patch, and descending level sorts
are also available. Whole-row clicks and keyboard fish buttons open the catch sheet;
record buttons remain independent.

The shared visibility-aware clock updates the ET display separately from the
one-second countdown. Forecasts are cached until an opening or closing boundary.
Bait and mooch steps include XIVAPI images. Their hover/focus/touch acquisition
panel uses the same shared Wiki transport, parser, cache, and verification as
glamour. Browser preview links to the original Wiki page without fabricated sources.

## Verification

`tests/fishing.test.mjs` covers data joins, weather transitions, overnight and
fractional boundaries, unknown conditions, filtering, and malformed stored data.
Browser review should cover desktop and narrow viewports in both themes, returning
to filtered results, persistence across reload, load-error retry, unavailable
storage, empty filters, and keyboard navigation. Browser verification does not
establish native Tauri packaging behavior.
