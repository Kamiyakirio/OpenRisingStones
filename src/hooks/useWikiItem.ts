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

  const load = async (nextItemName: string) => {
    const version = ++requestVersion.current;
    setItemName(nextItemName);
    setItem(null);
    setError(null);
    setStatus("loading");
    if (preview) {
      const previewItem: WikiItemData = {
        itemName: nextItemName,
        pageTitle: `物品:${nextItemName}`,
        canonicalUrl: "",
        imageUrl: null,
        description: "",
        facts: [],
        source: "safari",
      };
      setItem(previewItem);
      setStatus("ready");
      return previewItem;
    }
    try {
      const page = await fetchWikiItemPage(nextItemName);
      if (requestVersion.current !== version) return null;
      setStatus("parsing");
      const parsed = await parseWikiItemPage(page, nextItemName);
      if (requestVersion.current !== version) return null;
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
