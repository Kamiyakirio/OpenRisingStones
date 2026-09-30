/** Guard channel membership, special channel numbering, and non-destructive filters. */
import assert from "node:assert/strict";
import test from "node:test";
import {
  chatChannels,
  getChatChannel,
  matchesChatFilter,
  matchesChatFilters,
  toggleChatFilter,
  isChatCategorySelected,
} from "../src/features/chat/channels.ts";

test("multi-selection merges categories and channels without duplicating messages", () => {
  const kinds = [24, 41, 29, 57, 127];
  assert.deepEqual(
    kinds.filter((kind) =>
      matchesChatFilters(kind, ["group:player", "channel:24", "channel:57"]),
    ),
    [24, 29, 57],
  );
  assert.deepEqual(
    kinds.filter((kind) => matchesChatFilters(kind, [])),
    kinds,
  );
  assert.deepEqual(
    kinds.filter((kind) =>
      matchesChatFilters(kind, ["group:battle", "group:other"]),
    ),
    [41, 127],
  );
});

test("deselecting a category child keeps its siblings and other selected categories", () => {
  const selection = toggleChatFilter(
    ["group:player", "group:system"],
    "channel:24",
  );
  assert.equal(matchesChatFilters(24, selection), false);
  assert.equal(matchesChatFilters(29, selection), true);
  assert.equal(matchesChatFilters(57, selection), true);
  assert.equal(isChatCategorySelected("player", selection), false);
  const restored = toggleChatFilter(selection, "channel:24");
  assert.equal(isChatCategorySelected("player", restored), true);
  assert.deepEqual(toggleChatFilter(restored, "group:player"), [
    "group:system",
  ]);
  assert.deepEqual(toggleChatFilter(selection, "all"), []);
});

test("classifies by game channel rather than sender or message text", () => {
  for (const kind of [10, 12, 13, 14, 24, 28, 29, 37, 80, 94, 101, 107]) {
    assert.equal(getChatChannel(kind).category, "player");
  }
  for (const kind of [41, 43, 45, 49]) {
    assert.equal(getChatChannel(kind).category, "battle");
  }
  for (const kind of [56, 57, 69, 70, 75]) {
    assert.equal(getChatChannel(kind).category, "system");
  }
  assert.equal(getChatChannel(61).category, "npc");
  assert.equal(getChatChannel(68).category, "npc");
  assert.equal(getChatChannel(127).category, "other");
  assert.equal(matchesChatFilter(127, "all"), true);
  assert.equal(matchesChatFilter(127, "group:other"), true);
});

test("keeps individual linkshells and tell directions distinct", () => {
  assert.equal(
    new Set(chatChannels.map((entry) => entry.kind)).size,
    chatChannels.length,
  );
  assert.equal(matchesChatFilter(37, "channel:37"), true);
  assert.equal(matchesChatFilter(101, "channel:37"), false);
  assert.equal(matchesChatFilter(12, "channel:13"), false);
  assert.equal(matchesChatFilter(13, "channel:13"), true);
  assert.equal(getChatChannel(24).tone, "company");
  assert.equal(getChatChannel(28).tone, "emote");
  assert.equal(getChatChannel(29).tone, "emote");
});

test("switching filters preserves all messages and their chronological order", () => {
  const messages = [
    { sequence: 1, logKind: 24 },
    { sequence: 2, logKind: 41 },
    { sequence: 3, logKind: 29 },
    { sequence: 4, logKind: 57 },
  ];
  const before = structuredClone(messages);
  const select = (filter: Parameters<typeof matchesChatFilter>[1]) =>
    messages.filter((message) => matchesChatFilter(message.logKind, filter));
  assert.deepEqual(
    select("group:player").map((message) => message.sequence),
    [1, 3],
  );
  assert.deepEqual(
    select("group:battle").map((message) => message.sequence),
    [2],
  );
  assert.deepEqual(select("all"), before);
  assert.deepEqual(messages, before);
});
