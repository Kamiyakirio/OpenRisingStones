import { copyGearingText } from "../utils/clipboard.ts";
/** Share the original base62 payload without a desktop or local web address. */
import { useState } from "react";
import { observer } from "mobx-react-lite";
import { useStore } from "./contexts.tsx";
import { Button } from "./Controls.tsx";
export const SharePanel = observer(() => {
  const store = useStore();
  const [status, setStatus] = useState("");
  return (
    <div className="share card">
      <textarea readOnly aria-label="配装分享码" value={store.share} />
      <Button
        disabled={!store.share}
        onClick={async () => {
          try {
            await copyGearingText(store.share);
            setStatus(
              "分享码已复制。将分享码添加到任意部署了 ffxiv-gearing 的网址后面，用“?”分隔，即可通过网页分享。",
            );
          } catch {
            setStatus("复制失败，请手动复制上方分享码。");
          }
        }}
      >
        复制分享码
      </Button>
      <p role="status">{status}</p>
      <p>网页需要支持对应的编码版本和装备数据。</p>
    </div>
  );
});
