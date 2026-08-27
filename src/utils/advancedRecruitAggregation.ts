/** Testable pacing and bounded-concurrency engine for advanced aggregation. */
import type {
  AdvancedRecruitDataset,
  AdvancedRecruitProgress,
} from "../models/advancedRecruit";
import type {
  RecruitDetail,
  RecruitPage,
  RecruitPageOptions,
  RecruitSummary,
} from "../models/recruit";

export const ADVANCED_RECRUIT_PAGE_SIZE = 50;
export const ADVANCED_RECRUIT_DETAIL_CONCURRENCY = 8;
export const MIN_RECRUIT_LIST_INTERVAL_MS = 1_000;
export const MAX_RECRUIT_LIST_INTERVAL_MS = 5_000;
export const RATE_LIMIT_BACKOFF_BASE_MS = 2_000;
export const RATE_LIMIT_BACKOFF_MAX_MS = 60_000;

export type AdvancedRecruitLoaderOptions = {
  signal?: AbortSignal;
  onProgress?: (progress: AdvancedRecruitProgress) => void;
};

export type AdvancedRecruitLoaderDependencies = {
  fetchPage: (options: RecruitPageOptions) => Promise<RecruitPage>;
  fetchDetail: (id: number, signal?: AbortSignal) => Promise<RecruitDetail>;
  wait: (milliseconds: number, signal?: AbortSignal) => Promise<void>;
  random: () => number;
  isRateLimitError: (reason: unknown) => boolean;
};

/** Dependency injection keeps pacing, progress, and concurrency contract-testable. */
export async function collectAdvancedRecruitDataset(
  { signal, onProgress }: AdvancedRecruitLoaderOptions,
  dependencies: AdvancedRecruitLoaderDependencies,
): Promise<AdvancedRecruitDataset> {
  const filters = { dutyName: "", dutyType: "", areaId: "" };
  const firstPage = await dependencies.fetchPage({
    page: 1,
    limit: ADVANCED_RECRUIT_PAGE_SIZE,
    filters,
    signal,
  });
  const pageCount = Math.max(
    1,
    Math.ceil(firstPage.total / ADVANCED_RECRUIT_PAGE_SIZE),
  );
  let summaries = firstPage.items;
  reportProgress(onProgress, {
    stage: "list",
    completed: 1,
    total: pageCount,
    overallCompleted: 1,
    overallTotal: pageCount + firstPage.total,
  });

  for (let page = 2; page <= pageCount; page += 1) {
    await dependencies.wait(recruitListIntervalMs(dependencies.random), signal);
    throwIfAborted(signal);
    const result = await dependencies.fetchPage({
      page,
      limit: ADVANCED_RECRUIT_PAGE_SIZE,
      filters,
      signal,
    });
    summaries = mergeSummaries(summaries, result.items);
    reportProgress(onProgress, {
      stage: "list",
      completed: page,
      total: pageCount,
      overallCompleted: page,
      overallTotal: pageCount + firstPage.total,
    });
  }

  const details: Array<RecruitDetail | undefined> = Array(summaries.length);
  let cursor = 0;
  let completed = 0;
  let failedDetailCount = 0;
  const rateLimitCoordinator = new RateLimitCoordinator<RecruitDetail>(
    dependencies,
    (backoffAttempt, retryDelayMs) =>
      reportProgress(onProgress, {
        stage: "rate_limit",
        completed,
        total: summaries.length,
        overallCompleted: pageCount + completed,
        overallTotal: pageCount + summaries.length,
        backoffAttempt,
        retryDelayMs,
      }),
  );

  const loadDetail = async (index: number) => {
    const summary = summaries[index]!;
    while (true) {
      await rateLimitCoordinator.waitUntilOpen(signal);
      try {
        details[index] = await dependencies.fetchDetail(summary.id, signal);
        return;
      } catch (reason) {
        if (isAbortError(reason)) throw reason;
        if (!dependencies.isRateLimitError(reason)) {
          failedDetailCount += 1;
          return;
        }
        const recovery = await rateLimitCoordinator.recover(
          () => dependencies.fetchDetail(summary.id, signal),
          signal,
        );
        if (recovery.kind === "leader_success") {
          details[index] = recovery.value;
          return;
        }
        if (recovery.kind === "leader_failure") {
          failedDetailCount += 1;
          return;
        }
      }
    }
  };
  const loadWorker = async () => {
    while (cursor < summaries.length) {
      const index = cursor;
      cursor += 1;
      try {
        await loadDetail(index);
      } finally {
        completed += 1;
        reportProgress(onProgress, {
          stage: "detail",
          completed,
          total: summaries.length,
          overallCompleted: pageCount + completed,
          overallTotal: pageCount + summaries.length,
        });
      }
    }
  };
  await Promise.all(
    Array.from(
      {
        length: Math.min(ADVANCED_RECRUIT_DETAIL_CONCURRENCY, summaries.length),
      },
      loadWorker,
    ),
  );

  return {
    items: details.filter((item): item is RecruitDetail => Boolean(item)),
    failedDetailCount,
  };
}

export function recruitListIntervalMs(random: () => number = Math.random) {
  const normalized = Math.max(0, Math.min(1, random()));
  return (
    MIN_RECRUIT_LIST_INTERVAL_MS +
    Math.floor(
      normalized *
        (MAX_RECRUIT_LIST_INTERVAL_MS - MIN_RECRUIT_LIST_INTERVAL_MS),
    )
  );
}

export function rateLimitBackoffMs(attempt: number) {
  return Math.min(
    RATE_LIMIT_BACKOFF_MAX_MS,
    RATE_LIMIT_BACKOFF_BASE_MS * 2 ** Math.max(0, attempt - 1),
  );
}

export function waitForRecruitInterval(
  milliseconds: number,
  signal?: AbortSignal,
) {
  return new Promise<void>((resolve, reject) => {
    throwIfAborted(signal);
    const abort = () => {
      globalThis.clearTimeout(timer);
      reject(abortError());
    };
    const timer = globalThis.setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, milliseconds);
    signal?.addEventListener("abort", abort, { once: true });
  });
}

type ProbeOutcome<T> =
  { kind: "success"; value: T } | { kind: "failure"; reason: unknown };

type RecoveryResult<T> =
  | { kind: "leader_success"; value: T }
  | { kind: "leader_failure"; reason: unknown }
  | { kind: "follower" };

/** Shared gate pauses every worker and gives exactly one worker probe ownership. */
class RateLimitCoordinator<T> {
  private recovery: Promise<ProbeOutcome<T>> | null = null;
  private readonly dependencies: Pick<
    AdvancedRecruitLoaderDependencies,
    "isRateLimitError" | "wait"
  >;
  private readonly onBackoff: (attempt: number, delayMs: number) => void;

  constructor(
    dependencies: Pick<
      AdvancedRecruitLoaderDependencies,
      "isRateLimitError" | "wait"
    >,
    onBackoff: (attempt: number, delayMs: number) => void,
  ) {
    this.dependencies = dependencies;
    this.onBackoff = onBackoff;
  }

  async waitUntilOpen(signal?: AbortSignal) {
    const recovery = this.recovery;
    if (recovery) await recovery;
    throwIfAborted(signal);
  }

  async recover(
    probe: () => Promise<T>,
    signal?: AbortSignal,
  ): Promise<RecoveryResult<T>> {
    const activeRecovery = this.recovery;
    if (activeRecovery) {
      await activeRecovery;
      return { kind: "follower" };
    }

    const recovery = this.probeUntilRecovered(probe, signal);
    this.recovery = recovery;
    try {
      const outcome = await recovery;
      return outcome.kind === "success"
        ? { kind: "leader_success", value: outcome.value }
        : { kind: "leader_failure", reason: outcome.reason };
    } finally {
      if (this.recovery === recovery) this.recovery = null;
    }
  }

  private async probeUntilRecovered(
    probe: () => Promise<T>,
    signal?: AbortSignal,
  ): Promise<ProbeOutcome<T>> {
    let attempt = 1;
    while (true) {
      const delayMs = rateLimitBackoffMs(attempt);
      this.onBackoff(attempt, delayMs);
      await this.dependencies.wait(delayMs, signal);
      throwIfAborted(signal);
      try {
        return { kind: "success", value: await probe() };
      } catch (reason) {
        if (isAbortError(reason)) throw reason;
        if (!this.dependencies.isRateLimitError(reason)) {
          return { kind: "failure", reason };
        }
        attempt += 1;
      }
    }
  }
}

function mergeSummaries(current: RecruitSummary[], incoming: RecruitSummary[]) {
  const merged = new Map(current.map((item) => [item.id, item]));
  incoming.forEach((item) => merged.set(item.id, item));
  return [...merged.values()];
}

function reportProgress(
  listener: AdvancedRecruitLoaderOptions["onProgress"],
  progress: AdvancedRecruitProgress,
) {
  listener?.(progress);
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw abortError();
}

function abortError() {
  return new DOMException("Request aborted.", "AbortError");
}

function isAbortError(reason: unknown) {
  return reason instanceof DOMException && reason.name === "AbortError";
}
