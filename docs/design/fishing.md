# Fishing workspace

Mode: Operate. Target: `src/pages/FishingPage.tsx` / `#fishing`.

The fishing feature uses the shared OpenRisingStones shell and tokens. Its task
structure is distinct from a fish tracker table. Four destinations serve
the jobs players bring to the page: find a current or upcoming window,
check missing catches by region, map, and fishing spot, choose an upcoming
ocean voyage, and look up a named fish. No task hides the others behind a filter sidebar.

The ocean entry starts with the next local boarding times. Each departure shows
near and far routes with their three stops, time phases, available-fish count,
and route-specific blue-fish or achievement-category goals. Opening one voyage
replaces the schedule with that route's stop page. The normal and spectral
lists include only fish eligible for that stop's day/sunset/night phase;
weather, intuition, and spectral-current activation remain explicit conditions.
Rows reuse bait, bite, hookset, bookmark, and game-log progress controls.
Returning from a fish and then from the voyage restores both list positions.

The first view defaults its main current/upcoming window lists to fish kings and
fish emperors, ordered by opening or closing time. A compact control can show
all fish and remembers that choice locally. Saved targets and all-day
fish remain reachable. Upcoming rows show a seconds-accurate wait until the
fish becomes available, with the local opening time underneath. The completion directory drills from region to map and
lists fishing spots without expanding fish inline. A secondary navigation below
the completion heading separates rod/ocean fishing from spearfishing; counts
and every directory level follow the selected method. A spot opens its own page
with missing/all views; fish follow game log row order, with out-of-log entries
last. Returning from fish detail restores that spot page, and returning again
restores the directory position. A fish can appear at several spots; region
and map completion counts use distinct fish IDs. Direct lookup
accepts Chinese names, full pinyin, initials, English names, Item IDs, zones,
and spots. Its primary classification is how the
player schedules the catch: timed window, all-day, ocean voyage, or unknown
conditions. Game rarity remains secondary metadata.

Fish rows show only the bait name for a direct catch; those bait labels share
the acquisition popup used by fish detail. Mooch chains still show
each source → target catch, followed by that target's bite strength and hookset.
An inline circular-arrow icon marks an intermediate fish that can be mooched
into itself at that fishing spot. Item and action icons load from XIVAPI
when available. Spearfishing
rows show fish-shadow size because rod bait and hooksets do not apply. Missing
conditions remain labeled as unknown.

Direct lookup retains all earlier independent filters: patch, world/ocean,
rarity, time restriction, completion, rod/spear, region, collectible, aquarium,
saved, currently available, and Fish Eyes. The panel is open at desktop widths
and collapsible on narrow screens. Filters combine with the new classification.

Each fish opens a focused preparation page. The first band answers when, where,
and with what bait or fish shadow. Its spot name opens that spot's page and
returns to the fish detail on back. Bait names reveal Wiki acquisition details
on hover, focus, or click. Full conditions, ten expandable windows,
previous/current weather, bait chain, locations, and local weather forecast
follow. Window rows show start, end, and duration in three columns; the current
row labels remaining time. Returning preserves the task, search state, filters,
and list scroll.

On Windows desktop, the current character's game log supplies catch status for
its 1,806 in-log fish. Four quest fish outside that log retain manual marks.
The last synced game log remains available without a game connection and is
labelled with its save time. Without a saved log, local marks remain available
and unmarked fish are not presented as proven uncaught. Sync states and recovery
are explicit.

Use the established ivory/charcoal surfaces, system typography, gold selection,
and semantic green for open conditions. Keep the page flat and content-led:
structural rules, tab state, compact fish rows, and a time-first detail band.
Avoid decorative motion and full-page horizontal overflow. On narrow screens,
task columns stack, region choices scroll horizontally, and filter groups become
one column. Empty and unknown states name what data is missing and the next
useful action.
