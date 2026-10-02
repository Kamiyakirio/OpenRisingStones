/** Game LogKind classifications shared by desktop and phone display filters. */
export type ChatCategory = "player" | "battle" | "system" | "npc" | "other";
export type ChatFilter = "all" | `group:${ChatCategory}` | `channel:${number}`;
type ChatTone =
  | "say"
  | "shout"
  | "tell"
  | "party"
  | "linkshell"
  | "company"
  | "novice"
  | "emote"
  | "yell"
  | "echo"
  | "neutral";

export type ChatChannel = {
  kind: number;
  label: string;
  category: ChatCategory;
  tone: ChatTone;
};

export const chatCategories: { id: ChatCategory; label: string }[] = [
  { id: "player", label: "玩家聊天" },
  { id: "battle", label: "战斗记录" },
  { id: "system", label: "系统通知" },
  { id: "npc", label: "NPC 对话" },
  { id: "other", label: "其他消息" },
];

const channel = (
  kind: number,
  label: string,
  category: ChatCategory,
  tone: ChatTone = "neutral",
): ChatChannel => ({ kind, label, category, tone });

// IDs follow Dalamud's XivChatType / the game's LogKind sheet, not sender presence.
export const chatChannels: ChatChannel[] = [
  channel(0, "未分类", "other"),
  channel(1, "调试", "other"),
  channel(2, "紧急通知", "system"),
  channel(3, "通知", "system"),
  channel(10, "说话", "player", "say"),
  channel(11, "呼喊", "player", "shout"),
  channel(12, "悄悄话·发出", "player", "tell"),
  channel(13, "悄悄话·收到", "player", "tell"),
  channel(14, "小队", "player", "party"),
  channel(15, "团队", "player", "shout"),
  ...Array.from({ length: 8 }, (_, i) =>
    channel(16 + i, `通讯贝 ${i + 1}`, "player", "linkshell"),
  ),
  channel(24, "部队", "player", "company"),
  channel(27, "新人频道", "player", "novice"),
  channel(28, "自定义情感动作", "player", "emote"),
  channel(29, "情感动作", "player", "emote"),
  channel(30, "喊话", "player", "yell"),
  channel(32, "跨服小队", "player", "party"),
  channel(36, "PvP 战队", "player"),
  channel(37, "跨服通讯贝 1", "player", "party"),
  channel(41, "伤害", "battle"),
  channel(42, "未命中", "battle"),
  channel(43, "技能", "battle"),
  channel(44, "道具", "battle"),
  channel(45, "治疗", "battle"),
  channel(46, "获得增益", "battle"),
  channel(47, "获得减益", "battle"),
  channel(48, "增益消失", "battle"),
  channel(49, "减益消失", "battle"),
  channel(54, "幻化通知", "system"),
  channel(55, "闹钟", "system"),
  channel(56, "回显", "system", "echo"),
  channel(57, "系统", "system"),
  channel(58, "系统错误", "system"),
  channel(59, "采集系统通知", "system"),
  channel(60, "错误", "system"),
  channel(61, "NPC 对话", "npc"),
  channel(62, "战利品", "system"),
  channel(64, "进度", "system"),
  channel(65, "战利品掷骰", "system"),
  channel(66, "制作", "system"),
  channel(67, "采集", "system"),
  channel(68, "NPC 广播", "npc"),
  channel(69, "部队公告", "system", "company"),
  channel(70, "部队成员上下线", "system", "company"),
  channel(71, "雇员交易", "system"),
  channel(72, "招募通知", "system"),
  channel(73, "标记", "system"),
  channel(74, "随机数", "system"),
  channel(75, "新人频道通知", "system", "novice"),
  channel(76, "管弦乐琴", "system"),
  channel(77, "PvP 战队公告", "system"),
  channel(78, "PvP 战队成员上下线", "system"),
  channel(79, "留言簿", "system"),
  channel(80, "GM · 悄悄话", "player", "tell"),
  channel(81, "GM · 说话", "player", "say"),
  channel(82, "GM · 呼喊", "player", "shout"),
  channel(83, "GM · 喊话", "player", "yell"),
  channel(84, "GM · 小队", "player", "party"),
  channel(85, "GM · 部队", "player", "company"),
  ...Array.from({ length: 8 }, (_, i) =>
    channel(86 + i, `GM · 通讯贝 ${i + 1}`, "player", "linkshell"),
  ),
  channel(94, "GM · 新人频道", "player", "novice"),
  ...Array.from({ length: 7 }, (_, i) =>
    channel(101 + i, `跨服通讯贝 ${i + 2}`, "player", "party"),
  ),
];

const channelsByKind = new Map(
  chatChannels.map((entry) => [entry.kind, entry]),
);

export function getChatChannel(logKind: number): ChatChannel {
  return (
    channelsByKind.get(logKind) ??
    channel(logKind, `未知频道 #${logKind}`, "other")
  );
}

/** Filter display only; all captured messages remain available when switching filters. */
export function matchesChatFilter(
  logKind: number,
  filter: ChatFilter,
): boolean {
  if (filter === "all") return true;
  if (filter.startsWith("channel:")) {
    return logKind === Number(filter.slice("channel:".length));
  }
  return getChatChannel(logKind).category === filter.slice("group:".length);
}

/** An empty selection shows everything; selected categories and channels form a union. */
export function matchesChatFilters(
  logKind: number,
  filters: readonly ChatFilter[],
): boolean {
  return (
    filters.length === 0 ||
    filters.some((filter) => matchesChatFilter(logKind, filter))
  );
}

export function isChatCategorySelected(
  category: ChatCategory,
  filters: readonly ChatFilter[],
): boolean {
  if (filters.includes(`group:${category}`)) return true;
  if (category === "other") return false;
  const members = chatChannels.filter((entry) => entry.category === category);
  return members.every((entry) => filters.includes(`channel:${entry.kind}`));
}

/** Expand a selected category before removing one child, preserving the other channels. */
export function toggleChatFilter(
  filters: readonly ChatFilter[],
  target: ChatFilter,
): ChatFilter[] {
  if (target === "all") return [];
  if (target.startsWith("group:")) {
    const category = target.slice(6) as ChatCategory;
    const selected = isChatCategorySelected(category, filters);
    const remaining = filters.filter(
      (filter) =>
        filter !== target &&
        !(
          filter.startsWith("channel:") &&
          getChatChannel(Number(filter.slice(8))).category === category
        ),
    );
    return selected ? remaining : [...remaining, target];
  }
  const kind = Number(target.slice(8));
  const category = getChatChannel(kind).category;
  const group: ChatFilter = `group:${category}`;
  if (filters.includes(group)) {
    return [
      ...new Set<ChatFilter>([
        ...filters.filter((filter) => filter !== group && filter !== target),
        ...chatChannels
          .filter((entry) => entry.category === category && entry.kind !== kind)
          .map((entry): ChatFilter => `channel:${entry.kind}`),
      ]),
    ];
  }
  return filters.includes(target)
    ? filters.filter((filter) => filter !== target)
    : [...filters, target];
}
