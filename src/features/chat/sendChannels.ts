/** Send destinations are separate from received-message filters; IDs match the native ABI. */
export const chatSendChannels = [
  { id: "current", kind: 0, label: "当前游戏频道", prefix: "" },
  { id: "say", kind: 10, label: "说话", prefix: "/say " },
  { id: "shout", kind: 11, label: "呼喊", prefix: "/shout " },
  { id: "tell", kind: 12, label: "悄悄话", prefix: "/tell " },
  { id: "party", kind: 14, label: "小队", prefix: "/party " },
  { id: "alliance", kind: 15, label: "团队", prefix: "/alliance " },
  { id: "free_company", kind: 24, label: "部队", prefix: "/freecompany " },
  { id: "novice", kind: 27, label: "新人频道", prefix: "/novice " },
  { id: "yell", kind: 30, label: "喊话", prefix: "/yell " },
  { id: "echo", kind: 56, label: "本地回显（仅自己）", prefix: "/echo " },
  { id: "linkshell1", kind: 16, label: "通讯贝 1", prefix: "/linkshell1 " },
  { id: "linkshell2", kind: 17, label: "通讯贝 2", prefix: "/linkshell2 " },
  { id: "linkshell3", kind: 18, label: "通讯贝 3", prefix: "/linkshell3 " },
  { id: "linkshell4", kind: 19, label: "通讯贝 4", prefix: "/linkshell4 " },
  { id: "linkshell5", kind: 20, label: "通讯贝 5", prefix: "/linkshell5 " },
  { id: "linkshell6", kind: 21, label: "通讯贝 6", prefix: "/linkshell6 " },
  { id: "linkshell7", kind: 22, label: "通讯贝 7", prefix: "/linkshell7 " },
  { id: "linkshell8", kind: 23, label: "通讯贝 8", prefix: "/linkshell8 " },
  {
    id: "cross_linkshell1",
    kind: 37,
    label: "跨服通讯贝 1",
    prefix: "/cwlinkshell1 ",
  },
  {
    id: "cross_linkshell2",
    kind: 101,
    label: "跨服通讯贝 2",
    prefix: "/cwlinkshell2 ",
  },
  {
    id: "cross_linkshell3",
    kind: 102,
    label: "跨服通讯贝 3",
    prefix: "/cwlinkshell3 ",
  },
  {
    id: "cross_linkshell4",
    kind: 103,
    label: "跨服通讯贝 4",
    prefix: "/cwlinkshell4 ",
  },
  {
    id: "cross_linkshell5",
    kind: 104,
    label: "跨服通讯贝 5",
    prefix: "/cwlinkshell5 ",
  },
  {
    id: "cross_linkshell6",
    kind: 105,
    label: "跨服通讯贝 6",
    prefix: "/cwlinkshell6 ",
  },
  {
    id: "cross_linkshell7",
    kind: 106,
    label: "跨服通讯贝 7",
    prefix: "/cwlinkshell7 ",
  },
  {
    id: "cross_linkshell8",
    kind: 107,
    label: "跨服通讯贝 8",
    prefix: "/cwlinkshell8 ",
  },
] as const;

export type ChatSendChannel = (typeof chatSendChannels)[number]["id"];
const encoder = new TextEncoder();

export function chatMessageBudget(
  channel: ChatSendChannel,
  recipient: string,
): number {
  const prefix = chatSendChannels.find((entry) => entry.id === channel)!.prefix;
  return (
    500 -
    encoder.encode(prefix + (channel === "tell" ? recipient + " " : "")).length
  );
}

export function validTellRecipient(recipient: string): boolean {
  const [name] = recipient.split("@");
  return (
    name.trim() === name &&
    encoder.encode(recipient).length <= 128 &&
    /^[\p{L}][\p{L} '-]*@[\p{L}][\p{L}'-]*$/u.test(recipient)
  );
}
