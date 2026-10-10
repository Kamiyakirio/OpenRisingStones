/** Display the game channel independently from a potentially absent sender. */
import { getChatChannel } from "../utils/channels";

export function ChatChannelBadge({ logKind }: { logKind: number }) {
  const channel = getChatChannel(logKind);
  // Neutral labels follow the theme; game channel colors keep their paired text colors.
  return (
    <span
      className={
        'chat-channel-badge bg-line rounded-[4px] font-semibold [&&&&]:flex-[0_0_auto] [&&&&]:p-[1px_6px] [&&&&]:[color:#000000] [&&&&[data-tone="neutral"]]:text-ink [&&&&]:text-[0.6875rem] [&&&&]:leading-[1.5] [&&&&[data-tone="say"]]:[background:#ffffff] [&&&&[data-tone="shout"]]:[background:#ff4500] [&&&&[data-tone="tell"]]:[background:#ff69b4] [&&&&[data-tone="party"]]:[background:#1e90ff] [&&&&[data-tone="linkshell"]]:[background:#228b22] [&&&&[data-tone="company"]]:[background:#aa7781] [&&&&[data-tone="novice"]]:[background:#8b4513] [&&&&[data-tone="novice"]]:[color:#ffffff] [&&&&[data-tone="emote"]]:[background:#bbfff0] [&&&&[data-tone="yell"]]:[background:#ffff00] [&&&&[data-tone="echo"]]:[background:#808080]'
      }
      data-tone={channel.tone}
      title={`LogKind #${logKind}`}
    >
      {channel.label}
    </span>
  );
}
