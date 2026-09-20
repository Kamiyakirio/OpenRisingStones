# Interface copy

Status: implemented copy record and continuing guidance for direction B.
The home and workspace replacements below are reflected in the rebuilt web UI;
state-message patterns remain guidance unless explicitly recorded as implemented.
The user's confirmed direction is direct, specific language without generic
AI-sounding slogans or decorative thematic framing.

## Voice

Write as a useful tool for someone who already plays FF14. Use the game's familiar
terms, name the operation, and stop when the message is complete. Do not explain
what an adventurer is, celebrate routine clicks, or add a story around navigation.

- Keep player vocabulary: 招募, 幻化, 超域传送, 配装, 魔晶石, 同模装备.
- Keep the official product spelling: OpenRisingStones.
- Remove redundant sentences rather than finding a more stylish synonym.
- Do not alternate labels for variety. The same object has the same name.
- Preserve factual constraints, consent, deletion consequences, and uncertainty.
- Keep implementation vocabulary in diagnostic details, not primary UI messages.
- Give buttons an object where context does not already supply it. Do not repeat
  a feature title, description, and identical action label inside every small row.
- Risk copy names the action, the concrete consequence, and the available
  alternative. Never ask users to accept unspecified or “all possible” risks.
- Empty states name the unmatched condition and the next useful action. Avoid
  filler such as “try again” when the control already says what can be changed.

## Home

The home page is a feature directory. A player should be able to choose a tool
without reading an introduction.

| Location                  | Previous copy                                     | Implemented copy or treatment     |
| ------------------------- | ------------------------------------------------- | --------------------------------- |
| Product name              | OpenRisingStone                                   | OpenRisingStones                  |
| Eyebrow                   | 冒险者工具集                                      | Remove                            |
| Main heading              | 从这里，开启下一段旅程。                          | 工具                              |
| Introduction              | 选择一项功能，整理角色形象与跨区冒险计划。        | Remove                            |
| 招募 description          | 寻找同行者，组织下一次冒险。                      | 按副本、职业和大区筛选招募        |
| 幻化 description          | 浏览冒险者投稿，寻找你的下一套造型。              | 浏览幻化投稿，查看装备与染色      |
| 超域传送 description      | 规划跨区路线，快速抵达目的地。                    | 提交超域传送申请，查看订单状态    |
| 配装 description          | 规划装备与魔晶石搭配，为下一场战斗做好准备。      | 搭配装备与魔晶石，计算属性        |
| English feature subtitles | Recruit / Glamour / Regional Teleport / Gear Sets | Remove from the Chinese interface |
| Footer slogan             | 为艾欧泽亚冒险者打造                              | Remove                            |
| Attribution               | 非官方社区工具                                    | 非官方 FF14 工具                  |

Feature buttons use a whole-row click target. An arrow may
support that affordance; it should not become another nested button. The accessible
name must identify the feature. If an explicit action is needed outside that row,
use 查看招募, 浏览幻化, 打开超域传送, or 打开配装 as appropriate.

Recruitment copy must not imply that this application publishes recruitment or
creates parties. Teleport copy must not promise speed or guaranteed completion.
Do not present owned-item matching as available before its login and bridge
requirements have been met.

## Workspace headings and actions

These changes describe the rebuilt controls, not a global string substitution.
Preserve the actual event handler and operation behind each label. Authentication
uses “盛趣通行证” for the login action; “石之家” names the content source.

| Context                      | Previous copy                                                                  | Implemented copy                                  |
| ---------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------- |
| Glamour heading              | 发现下一套冒险者衣装。                                                         | 幻化                                              |
| Glamour introduction         | 从真实投稿中寻找装备组合、染色灵感与适合你的角色风格。                         | Remove; the filters and posts provide the context |
| Glamour time claim           | 今日幻化推荐                                                                   | Removed with the introduction                     |
| Glamour source               | 灵感来源 / 冒险者真实投稿                                                      | Removed with the introduction                     |
| Teleport form heading        | 安排本次旅程                                                                   | 选择角色与目标大区                                |
| Advanced recruitment failure | 高级招募初始化失败                                                             | 招募数据加载失败                                  |
| Advanced recruitment retry   | 重新初始化                                                                     | 重新加载                                          |
| Advanced recruitment loading | 正在聚合全部招募                                                               | 正在加载招募                                      |
| Advanced recruitment details | 正在并行读取详情 {completed} / {total}                                         | 正在加载招募详情 {completed} / {total}            |
| Advanced recruitment lists   | 正在按频控读取列表 {completed} / {total}                                       | 正在加载招募列表 {completed} / {total}            |
| Request throttling           | 已暂停全部请求，仅保留一个探测 worker。第 {attempt} 次退避，{seconds} 秒后探测 | 请求过于频繁，{seconds} 秒后自动重试              |
| Login expiry                 | 石之家会话已经失效。重新登录后会自动恢复幻化推荐与装备搜索。                   | 登录已过期 / 请重新登录盛趣通行证。               |
| Login-check progress         | 正在验证本地会话                                                               | 正在检查登录状态                                  |
| Gearing import button        | 导入                                                                           | 导入配装                                          |
| Settings confirmation action | 确认清除                                                                       | 清除本地数据                                      |

The throttling countdown is the actual next retry delay, not an estimated
completion time. The clear-data dialog must retain an accurate scope and
irreversibility statement verified against the deletion implementation; changing
its action label does not authorize shortening that explanation.

## Authentication copy and presentation

Both protected workspaces use the fullscreen `AuthenticationGate`, covering the
header and navigation. Keep their presentation and button geometry identical;
change only the feature/state copy. The login form opens above the barrier.
Escape closes the innermost form first, then the barrier returns home.

| Location                            | Implemented copy                               |
| ----------------------------------- | ---------------------------------------------- |
| Glamour title                       | 登录后使用幻化                                 |
| Glamour description                 | 登录后可浏览石之家幻化投稿和装备详情。         |
| Teleport title                      | 登录后使用超域传送                             |
| Teleport description                | 登录后可选择角色与目标大区，提交超域传送申请。 |
| Checking                            | 正在检查登录状态                               |
| Expired glamour title / description | 登录已过期 / 请重新登录盛趣通行证。            |
| Primary action / login form title   | 登录盛趣通行证                                 |
| Secondary action                    | 返回首页                                       |
| Barrier close accessible name       | 关闭并返回首页                                 |

## State messages

Use the narrowest known state. The following are patterns, not invented promises
or evidence that a corresponding button has already been implemented.

| State                           | Message                                                  | Action, when available                             |
| ------------------------------- | -------------------------------------------------------- | -------------------------------------------------- |
| No filtered recruitment results | 没有符合条件的招募。试试减少筛选条件。                   | 清除筛选, only when a reset control exists         |
| Recruitment fetch failed        | 招募列表加载失败，请重试。                               | 重新加载                                           |
| More results failed             | 后续招募加载失败，已加载的内容仍可查看。                 | 重试                                               |
| Glamour login required          | 登录后可浏览石之家幻化投稿和装备详情。                   | 登录盛趣通行证                                     |
| Game inventory not read         | 尚未读取游戏物品。                                       | 读取游戏物品, subject to the existing consent flow |
| Inventory cache may be stale    | 当前显示的是上次读取的物品，可能与游戏内不同。           | Refresh only when the bridge is available          |
| No teleport history             | 暂无传送记录                                             | No additional instruction is needed                |
| Gearing import failed           | 导入失败，请检查分享码版本和装备数据。当前配装未被覆盖。 | Preserve the entered code for correction           |
| Share code copied               | 分享码已复制                                             | No congratulatory message                          |

Do not turn a timeout, missing login, stale cache, or unsupported operating system
into an empty result. Do not invent a cause such as network failure unless the
application can distinguish it. Technical error details may remain available for
diagnosis without becoming the main heading.

## Consequences for the new visual design

- Use a normal workspace heading. Do not reserve a hero region for a slogan.
- Keep navigation names and feature descriptions readable together. Avoid oversized
  icon scenes whose only role is filling identical cards.
- Size controls from their task and input method, not from a marketing layout.
- Do not use decorative English, serial numbers, invented archive counts, or fake
  recent activity to make an otherwise empty layout look designed.
- Let glamour images, recruitment composition, equipment stats, and travel state
  supply each workspace's meaningful content and visual emphasis.
- Keep one shared vocabulary for controls, selection, focus, errors, and disabled
  states across workspaces. Content density can vary with the task.
- Visual proposal names are discussion labels, not product branding or UI copy.

The user selected option B from the previous comparison board as the main visual
direction. Its slogans and generated emblems are not requirements. Use the copy
above with the finalized visual language in `../../DESIGN.md`.

## Review criteria

Read every message alongside its actual control and state. Check whether it adds
information, whether the action exists, and whether the claim remains true without
login, on unsupported platforms, or while data is stale. Check realistic text
wrapping, zoom, keyboard names, and both themes when this copy changes. The current
web rebuild was reviewed at 1280px desktop and 390px mobile in both themes;
synthetic fixtures do not verify native or authenticated service outcomes.

## Source references

- `src/pages/HomePage.tsx`: feature entrypoints and current home copy.
- `src/pages/GlamourPage.tsx` and `src/features/glamour/components/GlamourGallery.tsx`: workspace heading and posts.
- `src/features/auth/components/AuthenticationGate.tsx`: shared fullscreen login boundary.
- `src/features/glamour/components/GlamourLoginWall.tsx`: glamour-specific auth copy.
- `src/features/auth/components/LoginDialog.tsx`: login form labels.
- `src/features/recruit/components/AdvancedRecruitBrowser.tsx`: loading and retry states.
- `src/features/teleport/components/TeleportWorkspace.tsx`: character and destination form.
- `src/features/settings/components/SettingsDialog.tsx`: local-data confirmation.
- `src/pages/GearingPage.tsx`: import action and failure behavior.
