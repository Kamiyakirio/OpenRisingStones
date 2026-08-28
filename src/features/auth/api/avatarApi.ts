/** Shared avatar transport with request deduplication and bounded concurrency. */
import { invoke } from "@tauri-apps/api/core";
import { isSupportedRisingStonesAvatar } from "@/features/auth/utils/risingStonesAvatar";
import { isTauriRuntime } from "@/shared/lib/runtime";

type AvatarResponse = { dataUrl: string };
type AvatarTask = {
  run: () => Promise<string>;
  resolve: (value: string) => void;
  reject: (reason: unknown) => void;
};

const MAX_CONCURRENT_AVATAR_REQUESTS = 4;
const MAX_FRONTEND_AVATAR_CACHE_ENTRIES = 512;

const requests = new Map<string, Promise<string>>();
const queue: AvatarTask[] = [];
let activeRequests = 0;

export function isProxiedRisingStonesAvatar(url: string | null) {
  return isSupportedRisingStonesAvatar(url);
}

export function fetchRisingStonesAvatar(url: string) {
  if (!isProxiedRisingStonesAvatar(url) || !isTauriRuntime()) {
    return Promise.resolve(url);
  }
  const existing = requests.get(url);
  if (existing) return existing;
  if (requests.size >= MAX_FRONTEND_AVATAR_CACHE_ENTRIES) {
    const oldest = requests.keys().next().value;
    if (oldest) requests.delete(oldest);
  }
  const request = scheduleAvatarRequest(async () => {
    const response = await invoke<AvatarResponse>(
      "fetch_rising_stones_avatar",
      { request: { url } },
    );
    return response.dataUrl;
  }).catch((reason) => {
    requests.delete(url);
    throw reason;
  });
  requests.set(url, request);
  return request;
}

function scheduleAvatarRequest(run: () => Promise<string>) {
  return new Promise<string>((resolve, reject) => {
    queue.push({ run, resolve, reject });
    drainAvatarQueue();
  });
}

function drainAvatarQueue() {
  while (activeRequests < MAX_CONCURRENT_AVATAR_REQUESTS && queue.length) {
    const task = queue.shift()!;
    activeRequests += 1;
    task
      .run()
      .then(task.resolve, task.reject)
      .finally(() => {
        activeRequests -= 1;
        drainAvatarQueue();
      });
  }
}
