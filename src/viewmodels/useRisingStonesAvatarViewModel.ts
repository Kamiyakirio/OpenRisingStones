/** Resolves one remote avatar through the shared controlled image transport. */
import { useCallback, useEffect, useState } from "react";
import {
  fetchRisingStonesAvatar,
  isProxiedRisingStonesAvatar,
} from "../services/avatarApi";
import { selectAvatarSource } from "../utils/risingStonesAvatar";

type ResolvedAvatar = {
  url: string | null;
  source: string | null;
  failed: boolean;
};

export function useRisingStonesAvatarViewModel(url: string | null) {
  const [resolved, setResolved] = useState<ResolvedAvatar>({
    url: null,
    source: null,
    failed: false,
  });
  const proxied = isProxiedRisingStonesAvatar(url);
  const current = resolved.url === url ? resolved : null;
  const source = selectAvatarSource(url, proxied, current);

  useEffect(() => {
    if (!url || !proxied) return;
    let active = true;
    fetchRisingStonesAvatar(url)
      .then((avatarSource) => {
        if (active) {
          setResolved({ url, source: avatarSource, failed: false });
        }
      })
      .catch(() => {
        if (active) setResolved({ url, source: null, failed: true });
      });
    return () => {
      active = false;
    };
  }, [proxied, url]);

  const markFailed = useCallback(() => {
    setResolved({ url, source: null, failed: true });
  }, [url]);

  return {
    source,
    loading: Boolean(url && proxied && !current),
    failed: current?.failed ?? false,
    markFailed,
  };
}
