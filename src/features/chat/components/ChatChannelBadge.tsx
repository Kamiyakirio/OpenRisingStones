/** Display the game channel independently from a potentially absent sender. */
import { getChatChannel } from "../utils/channels";
export function ChatChannelBadge({ logKind }: { logKind: number }) {
  const channel = getChatChannel(logKind);
  // Neutral labels follow the theme; game channel colors keep their paired text colors.
  return (
    <span
      className={
        'chat-channel-badge shrink-0 rounded-sm bg-line px-1.5 py-[1px] text-[0.6875rem] leading-[1.5] font-semibold text-[#000000] data-[tone="company"]:bg-[#aa7781] data-[tone="echo"]:bg-[#808080] data-[tone="emote"]:bg-[#bbfff0] data-[tone="linkshell"]:bg-[#228b22] data-[tone="neutral"]:text-ink data-[tone="novice"]:bg-[#8b4513] data-[tone="novice"]:text-[#ffffff] data-[tone="party"]:bg-[#1e90ff] data-[tone="say"]:bg-[#ffffff] data-[tone="shout"]:bg-[#ff4500] data-[tone="tell"]:bg-[#ff69b4] data-[tone="yell"]:bg-[#ffff00]'
      }
      data-tone={channel.tone}
      title={`LogKind #${logKind}`}
    >
      {channel.label}
    </span>
  );
}
