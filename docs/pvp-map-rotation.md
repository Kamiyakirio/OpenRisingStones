# PvP map rotation

The home page calculates map availability for the current 7.5/7.56 game rules. It does not query a live game queue. Update the map lists, intervals, and phase anchors when a later patch changes the rotation; verify the new phase against an observed in-game map before release.

## Sources

- [Official 7.5 patch notes](https://na.finalfantasyxiv.com/lodestone/topics/detail/07320affa7e0fcd9685afcbe54fbf55405b6d822/) specify the eight-slot Frontline order, the 15:00 UTC daily switch, the seven-slot Crystalline Conflict order, and its 60-minute interval.
- [Chinese official 7.5 page](https://actff1.web.sdo.com/project/20240927dawntrail/patch75/index.html) confirms the patch and the new arena for the Chinese service. The [official PvP guide](https://actff1.web.sdo.com/project/160810event/page6.html) supplies Chinese Crystalline Conflict names; its Frontline pages supply the Chinese Frontline names.
- The [open-source PvP calendar implementation](https://github.com/ffxiv-wakeng/pvp-calendar/blob/master/src/lib/rotation.ts) supplies observed phase anchors after the 7.5 release: Frontline Seize at 2026-04-27 15:00 UTC and Crystalline Conflict Palaistra at 2026-04-28 13:00 UTC. This application rotates the Frontline array to the official order, so its equivalent Seize anchor is 2026-05-01 15:00 UTC.

`src/shared/utils/pvpMap.ts` uses epoch-based UTC slots. Frontline changes at 23:00 Beijing time; Crystalline Conflict changes on each hour relative to its phase anchor. The home page formats the next boundary in the user's local timezone and refreshes at that boundary or when the window regains focus.
