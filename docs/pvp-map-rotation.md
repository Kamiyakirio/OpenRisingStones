# PvP map rotation

The home page calculates map availability for the current 7.5/7.56 game rules. It does not query a live game queue. Update the map lists, intervals, and phase anchors when a later patch changes the rotation; verify the new phase against an observed in-game map before release.

## Sources

- [Official 7.5 patch notes](https://na.finalfantasyxiv.com/lodestone/topics/detail/07320affa7e0fcd9685afcbe54fbf55405b6d822/) specify the eight-slot Frontline order, the 15:00 UTC daily switch, the seven-slot Crystalline Conflict order, and its 60-minute interval.
- [Chinese official 7.5 page](https://actff1.web.sdo.com/project/20240927dawntrail/patch75/index.html) confirms the patch and the new arena for the Chinese service. The [official PvP guide](https://actff1.web.sdo.com/project/160810event/page6.html) supplies Chinese Crystalline Conflict names; its Frontline pages supply the Chinese Frontline names.
- The [open-source PvP calendar implementation](https://github.com/ffxiv-wakeng/pvp-calendar/blob/master/src/lib/rotation.ts) supplies observed phase anchors after the 7.5 release: Frontline Seize at 2026-04-27 15:00 UTC and Crystalline Conflict Palaistra at 2026-04-28 13:00 UTC. This application rotates the Frontline array to the official order, so its equivalent Seize anchor is 2026-05-01 15:00 UTC.

`src/shared/utils/pvpMap.ts` uses epoch-based UTC slots. Frontline changes at 23:00 Beijing time; Crystalline Conflict changes on each hour relative to its phase anchor. The home page formats the next boundary in the user's local timezone, displays a seconds-based countdown, and refreshes on both the boundary and window resume.

## Map thumbnails

The home page uses each duty's `ContentFinderCondition.Image` from the [XIVAPI search API](https://v2.xivapi.com/docs/guides/search/) and loads its high-resolution icon through the [asset API](https://v2.xivapi.com/docs/guides/assets/). Frontline duty rows have map-specific images. Casual and ranked Crystalline Conflict rows use generic icons, so the map-specific images come from their custom-match duty rows. The map-to-image IDs are stored alongside the rotation names in `src/shared/utils/pvpMap.ts`.

The existing XIVAPI CDN mirror is tried first; the official XIVAPI asset endpoint is the fallback. If both fail, the map name and rotation time remain visible. New PvP maps need an image ID check when the rotation list changes.
