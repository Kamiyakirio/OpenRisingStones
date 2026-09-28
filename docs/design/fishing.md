# Fishing workspace

Mode: Operate. Target: `src/pages/FishingPage.tsx` / `#fishing`.

The fishing feature uses the shared OpenRisingStones shell and tokens. Its task
structure is distinct from a fish tracker table. Three equal destinations serve
the three jobs players bring to the page: find a current or upcoming window,
check missing catches by region, and look up a named fish. No task hides the
others behind a filter sidebar.

The first view shows current and upcoming finite windows for fish not yet
recorded, ordered by their opening or closing time. Saved targets and all-day
fish remain reachable. The completion view groups fish by region and shows the
remaining entries. Direct lookup accepts Chinese names, full pinyin, initials,
English names, Item IDs, zones, and spots. Its primary classification is how the
player schedules the catch: timed window, all-day, ocean voyage, or unknown
conditions. Game rarity remains secondary metadata.

Direct lookup retains all earlier independent filters: patch, world/ocean,
rarity, time restriction, completion, rod/spear, region, collectible, aquarium,
saved, currently available, and Fish Eyes. The panel is open at desktop widths
and collapsible on narrow screens. Filters combine with the new classification.

Each fish opens a focused preparation page. The first band answers when, where,
and with what bait or fish shadow. Full conditions, ten expandable windows,
previous/current weather, bait chain, locations, and local weather forecast
follow. Window rows show start, end, and duration in three columns; the current
row labels remaining time. Returning preserves the task, search state, filters,
and list scroll.

On Windows desktop, the current character's game log supplies catch status for
its 1,806 in-log fish. Four quest fish outside that log retain manual marks.
Without a game connection, local marks remain available and unmarked fish are
not presented as proven uncaught. Sync states and recovery are explicit.

Use the established ivory/charcoal surfaces, system typography, gold selection,
and semantic green for open conditions. Keep the page flat and content-led:
structural rules, tab state, compact fish rows, and a time-first detail band.
Avoid decorative motion and full-page horizontal overflow. On narrow screens,
task columns stack, region choices scroll horizontally, and filter groups become
one column. Empty and unknown states name what data is missing and the next
useful action.
