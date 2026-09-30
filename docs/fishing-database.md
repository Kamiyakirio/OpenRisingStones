# Fishing database

The first workflow is available from the home directory and `#fishing`, without
authentication: search/filter fish, open a catch sheet, then save a target or mark
it caught. Returning to the list preserves its filters, page, and scroll position.
Manual progress uses `ors.fishing.progress.v1` in local storage and is removed by
the existing clear-local-data action. On Windows desktop, the page reads the
loaded FFXIV character's rod and spear catch bits automatically on entry, every
30 seconds, and when the app regains focus. Game-log entries override manual
catch marks while that character is available. Rows absent from the game log
remain manually editable. The app does not persist a character's game-log bits
to shared local storage, so another character cannot inherit that snapshot.

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
`TerritoryType`, `IKDRoute`, and `IKDRouteTable` sheets from
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
259 records belong to ocean voyages. The
[DistantSeas ocean data](https://github.com/NotNite/DistantSeas/tree/main/Data)
adds per-spot day/sunset/night exclusions and fills the remaining ocean bait,
bite-strength, and hookset gaps. Its AGPL license is included in
`licenses/distantseas/LICENSE`. Empty weather arrays mean unrestricted,
whereas null means unknown. Teamcraft's MIT license is included separately.
This merges visible game-log entries with tracker records, not a claim of future-patch completeness.
Chinese names fall back to upstream English when unavailable. The upstream
`bigFish` flag is enriched by Teamcraft's `legendary-fish.json`; `item-patch.json`
fills ordinary-fish release versions. Ocean rarity 2 and 3 identifies rare and
legendary ocean fish. Unclassified guide entries and unknown conditions are
explicit. Aquarium information is available only where supplied by the tracker.

The catalog includes FishParameter and SpearfishingItem row IDs beside Item IDs;
the game stores catch bits by those row IDs. The current snapshot maps 1,806 of
1,810 entries. Four delivery quest fish (Item IDs 43903–43906) exist in
FishParameter only as rows 15185–15188 with `IsInLog=False`; they have no
historical caught bit and retain manual marks. The 1,806 in-game log entries
are fully mapped. [FFXIVClientStructs PlayerState](https://github.com/aers/FFXIVClientStructs/blob/main/FFXIVClientStructs/FFXIV/Client/Game/UI/PlayerState.cs)
documents the bit-array layout; game updates may require revalidation.
The generated catalog also stores tone-free full pinyin and initials for each
Chinese fish name, so lookup does not ship a pinyin dictionary to every page.

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
start time. The route page uses the game's 21 route variants and 144-slot
rotation, groups near and far voyages at each local two-hour boarding time,
and opens a separate page for the selected voyage. Its three stops show only
fish eligible at that stop's day/sunset/night phase. The 15-minute boarding
window and rotation anchor were checked against the displayed 2026-09-29
18:00 China-time voyages; verify the anchor again after a route-table change.
Weather and Fisher's Intuition can still restrict a listed fish. Unknown ocean
weather sets remain explicit, not silently unrestricted.

## Workspace and detail behavior

Four task views show current/next windows, region → map → fishing spot
completion, upcoming ocean voyages, and direct lookup. The window view defaults its main lists to fish
kings and emperors, with a locally remembered switch to all fish; saved and
all-day side tasks retain their full scope. Upcoming rows show the live wait
to the next window and its local start time. Direct lookup supports Chinese names, full
pinyin, initials, English
names, Item IDs, zones, and spots. Its primary classes are timed, all-day,
ocean-voyage, and unknown-condition fish. The earlier independent facets remain
available in the lookup filter panel: patch families, world/ocean, fish kind,
time restrictions, completion, rod/spear, region, saved targets, aquarium,
collectables, current eligibility, and Fish Eyes. Name, descending release
patch, and descending level sorts remain available. Fish row buttons open a
focused preparation page while save buttons stay independent. Direct catches
show their bait without repeating the row's target fish. Mooch chains show
each source and target fish, bite strength, and target hookset. Item and Fisher
hookset Action icons load through XIVAPI; unknown
values stay explicit. Spearfishing rows show fish-shadow size instead.
An inline circular-arrow icon marks a mooch fish with confirmed self-catch
records at the selected spot. These relationships are read from Teamcraft's
public bait counts by exact fish and spot, rather than inferred from the
guide's shortest catch path.

The tracker supplies most bite and hookset values. Teamcraft fills a missing
value even when the tracker already supplies other conditions for that fish.
The current catalog resolves 80 previously blank hooksets this way. For 39
remaining rod or ocean fish, neither source supplies a bite or hookset; rows
show that the data needs checking instead of guessing from rarity or tug.

Cast-to-bite time is read on demand from Teamcraft's public
[Gubal GraphQL service](https://gubal.ffxivteamcraft.com/graphql). Its
[`bite_time_per_fish_per_spot_per_bait` query](https://github.com/ffxiv-teamcraft/ffxiv-teamcraft/blob/staging/apps/client/src/app/pages/db/service/fish-data.gql.ts)
groups community reports by target fish, fishing spot, bait, and whole second.
Catalog rows request only the first suggested bait for each catch step;
mooch catches use each intermediate target and source fish separately. The
fish detail has a prominent bait-comparison section that merges guide baits
with reported successful baits for the chosen fishing spot. Baits without
enough timing samples remain visible with an explicit missing-time label. Its spot
selector keeps different locations separate and updates the detail plan,
catch-step bite times, and weather forecast together. The spot page uses its
selected spot and passes that spot into fish detail; other rows use the fish's first
listed spot. Bins with fewer than three
reports are excluded, and the displayed range spans the middle 90% of
qualifying reports. The total sample count appears beside the range. Skills,
gear, and bait can shift actual bite times, so this is a planning reference.
Missing samples and network errors have distinct states. These queries send
game item and spot IDs only, without character or catch-log data.

`TerritoryType.PlaceName{Region}` supplies each spot's region; the existing
territory map name and fishing spot ID supply the next two levels. Fish at
multiple spots appear under each location, while region and map completion
counts include each Item ID once. A fishing/spearfishing navigation scopes
all three levels and their recorded totals; fishing includes rod and ocean
entries. The directory shows only fishing spots;
opening a spot replaces it with a fish list. That list follows FishParameter
or SpearfishingItem game-log row order, rather than Chinese-name collation.
Out-of-log fish follow the indexed rows. Missing and all entries can be viewed
without losing the directory's position.

The preparation page places the next window, location, and bait or fish shadow
first. Window rows show start, end, and duration as three columns. The current
row displays remaining time; later rows display their full duration. Details
retain bait/mooch order, weather transitions, local forecast, and all fishing
spots. Returning preserves the active task, lookup filters, and scroll position.

The shared visibility-aware clock updates the ET display separately from the
one-second countdown. Forecasts are cached until an opening or closing boundary.
Bait and mooch steps include XIVAPI images. Their hover/focus/touch acquisition
panel uses the same shared Wiki transport, parser, cache, and verification as
glamour. Browser preview links to the original Wiki page without fabricated sources.

## Verification

`tests/fishing.test.ts` covers data joins, weather transitions, overnight and
fractional boundaries, unknown conditions, combined filtering, pinyin search,
duration formatting, and malformed stored data.
Browser review should cover desktop and narrow viewports in both themes, returning
to filtered results, persistence across reload, load-error retry, unavailable
storage, empty filters, and keyboard navigation. Browser verification does not
establish native Tauri packaging behavior.
