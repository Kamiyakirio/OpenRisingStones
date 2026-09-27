/** Display the game channel independently from a potentially absent sender. */
import { getChatChannel } from "./channels";
import "./ChatDisplay.css";

export function ChatChannelBadge({ logKind }: { logKind: number }) {
  const channel = getChatChannel(logKind);
  return (
    <span
      className="chat-channel-badge"
      data-tone={channel.tone}
      title={`LogKind #${logKind}`}
    >
      {channel.label}
    </span>
  );
}
