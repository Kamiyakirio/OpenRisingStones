# Fishing workspace

Mode: Operate. Route: `#fishing`.

This surface follows the shared OpenRisingStones visual system in `DESIGN.md`.
Its task and responsive contract is maintained in `docs/design/fishing.md`.
The user rejected the previous fish-tracker table and explicitly retained the
full independent filter set during the redesign. Chinese fish names must also
match full pinyin and initials. Window rows require start, end, and duration
columns with seconds preserved.

The current-window main column defaults to fish kings and fish emperors, with
an explicit switch to all fish. The chosen range persists locally. Saved
targets and all-day summaries remain independent of that switch. Upcoming
rows show a live wait countdown above the local opening time.

The completion task first separates fishing (rod and ocean) from spearfishing,
then follows game-data geography: region, map, and a list of fishing spots.
Opening a spot replaces the directory with a separate fish page;
fish use game-log order, and back navigation restores the directory position.
A fish can appear at several spots; completion totals at region and map level
count each Item ID once. Keep the three directory levels scannable at desktop
width and stack them without horizontal page overflow on narrow screens.
The spot page places compact, bait-specific community catch statistics before
its fish list. Fish rows in that statistic show successful-catch share and
sample count; the bait summary keeps combined miss reports separate because
they cannot identify the escaped fish or isolate a pure escape percentage.

The ocean task begins with departures every two hours, paired near and far
routes, local boarding time, and three ordered stops. Clicking a departure
opens a separate route page. Each stop separates normal and spectral catches
and filters fish by that voyage's day/sunset/night phase. The schedule preview
shows the route variant's blue-fish or achievement goals and the full route count.
Ordinary fish never fill target slots. The row-level bookmark and
recorded-status controls make this a catch plan, not a static
route directory. Restore the schedule position when returning.

Fish rows name only the bait for direct catches; mooch chains name each source
and target catch. Bite strength and target hookset use short labels and game
icons. An inline circular arrow denotes a confirmed self-mooch for the source
fish at the selected spot. Spearfishing
substitutes fish-shadow size. Unknown conditions are
explicit rather than inferred from neighboring fish.
