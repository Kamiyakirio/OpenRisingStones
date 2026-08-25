/** Coordinates Safari wiki requests, background verification, and HTML parsing. */
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import { isTauriRuntime } from "../services/glamourApi";
import {
  cancelWikiVerification,
  fetchWikiItemPage,
  parseWikiItemPage,
  showWikiVerification,
  type WikiItemData,
  type WikiStatusEvent,
} from "../services/wikiApi";

const wikiItemCache = new Map<string, WikiItemData>();

export type WikiLoadStatus =
  | "idle"
  | "loading"
  | "background_verification"
  | "interaction_required"
  | "parsing"
  | "ready"
  | "error";

export function useWikiItem() {
  const preview = !isTauriRuntime();
  const [status, setStatus] = useState<WikiLoadStatus>("idle");
  const [itemName, setItemName] = useState("");
  const [item, setItem] = useState<WikiItemData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  useEffect(() => {
    if (preview) return;
    let disposed = false;
    let unlisten: UnlistenFn | undefined;
    void listen<WikiStatusEvent>("wiki://status", (event) => {
      if (disposed) return;
      if (
        event.payload.status === "background_verification" ||
        event.payload.status === "interaction_required"
      ) {
        setStatus(event.payload.status);
      }
    }).then((stopListening) => {
      if (disposed) stopListening();
      else unlisten = stopListening;
    });
    return () => {
      disposed = true;
      unlisten?.();
      void cancelWikiVerification().catch(() => undefined);
    };
  }, [preview]);

  const load = async (nextItemName: string, equipmentId?: number) => {
    const version = ++requestVersion.current;
    setItemName(nextItemName);
    setError(null);
    const cacheKey = equipmentId ? String(equipmentId) : nextItemName;
    const cached = wikiItemCache.get(cacheKey);
    if (cached) {
      setItem(cached);
      setStatus("ready");
      return cached;
    }
    setItem(null);
    setStatus("loading");
    if (preview) {
      const previewModelItems = Array.from({ length: 12 }, (_, index) => ({
        id: equipmentId ? equipmentId + index + 1 : null,
        name: `${nextItemName}同模变体 ${index + 1}`,
        category: "同部位装备",
        iconUrl: null,
        wikiUrl: "",
        relation: index < 6 ? ("identical" as const) : ("primary" as const),
        dyeable: index % 2 === 0,
        unobtainable: index === 11,
        sourceSummary: index === 11 ? "" : "预览来源",
        sourceTypes: ["other" as const],
      }));
      const previewItem: WikiItemData = {
        itemName: nextItemName,
        pageTitle: `物品:${nextItemName}`,
        canonicalUrl: "",
        unobtainable: false,
        acquisitions: [
          {
            type: "dungeon",
            label: "通过副本获得",
            summary: "遗忘行路雾之迹",
            details: [
              {
                title: "遗忘行路雾之迹",
                description: "安度西亚斯等 2 处出现",
                requirement: null,
                location: null,
                url: null,
                items: [],
              },
            ],
          },
        ],
        modelItems: [
          {
            id: equipmentId ?? null,
            name: nextItemName,
            category: "脚部防具",
            iconUrl: null,
            wikiUrl: "",
            relation: "current",
            dyeable: false,
            unobtainable: false,
            sourceSummary: "副本（遗忘行路雾之迹）",
            sourceTypes: ["dungeon"],
          },
          ...previewModelItems,
        ],
        source: "safari",
      };
      wikiItemCache.set(cacheKey, previewItem);
      setItem(previewItem);
      setStatus("ready");
      return previewItem;
    }
    try {
      const page = await fetchWikiItemPage(nextItemName);
      if (requestVersion.current !== version) return null;
      setStatus("parsing");
      const parsed = await parseWikiItemPage(page, nextItemName, equipmentId);
      if (requestVersion.current !== version) return null;
      wikiItemCache.set(cacheKey, parsed);
      setItem(parsed);
      setStatus("ready");
      return parsed;
    } catch (reason) {
      if (requestVersion.current !== version) return null;
      setError(readError(reason));
      setStatus("error");
      return null;
    }
  };

  const showVerification = async () => {
    try {
      await showWikiVerification();
    } catch (reason) {
      setError(readError(reason));
      setStatus("error");
    }
  };

  const cancelVerification = async () => {
    requestVersion.current += 1;
    try {
      await cancelWikiVerification();
    } catch {
      // The background tab may have completed between the click and invoke.
    }
    setStatus("idle");
    setError(null);
  };

  const dismissError = () => {
    setStatus("idle");
    setError(null);
  };

  return {
    status,
    itemName,
    item,
    error,
    load,
    showVerification,
    cancelVerification,
    dismissError,
  };
}

export type WikiItemInspector = ReturnType<typeof useWikiItem>;

function readError(reason: unknown) {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === "string") return reason;
  if (
    typeof reason === "object" &&
    reason !== null &&
    "message" in reason &&
    typeof reason.message === "string"
  ) {
    return reason.message;
  }
  return "无法读取 Wiki 物品资料";
}
