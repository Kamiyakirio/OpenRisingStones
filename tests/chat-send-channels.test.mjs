/** Check the shared send contract, byte budgets, and safe tell addressing. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  chatSendChannels,
  chatMessageBudget,
  validTellRecipient,
} from "../src/features/chat/sendChannels.ts";

test("all send destinations agree with the native IDs and prefixes", () => {
  const native = readFileSync(
    new URL("../game-bridge/payload/src/chat_input.hpp", import.meta.url),
    "utf8",
  );
  const protocol = readFileSync(
    new URL("../game-bridge/crates/protocol/src/chat.rs", import.meta.url),
    "utf8",
  );
  const prefixes = new Map(
    [...native.matchAll(/case (\d+):\s*return "([^"]*)"/g)].map((match) => [
      Number(match[1]),
      match[2],
    ]),
  );
  assert.equal(new Set(chatSendChannels.map((channel) => channel.id)).size, 26);
  for (const channel of chatSendChannels) {
    assert.equal(prefixes.get(channel.kind), channel.prefix, channel.id);
    const variant = channel.id.replace(
      /(^|_)([a-z])/g,
      (_, separator, letter) => letter.toUpperCase(),
    );
    assert.match(protocol, new RegExp(`\\b${variant} = ${channel.kind},`));
  }
});

test("prefixes and tell destinations consume the complete UTF-8 entry budget", () => {
  assert.equal(chatMessageBudget("current", ""), 500);
  assert.equal(chatMessageBudget("say", ""), 495);
  assert.equal(chatMessageBudget("tell", "Player Name@World"), 476);
});

test("tell recipients require a single world and cannot inject command text", () => {
  assert.equal(validTellRecipient("Player Name@World"), true);
  assert.equal(validTellRecipient("O'Name@World"), true);
  for (const target of [
    "",
    "Name",
    "Name @World",
    "Name@World extra",
    "Name@World@Other",
    "Name@World\n/logout",
    "Name/<t>@World",
  ]) {
    assert.equal(validTellRecipient(target), false, target);
  }
});
