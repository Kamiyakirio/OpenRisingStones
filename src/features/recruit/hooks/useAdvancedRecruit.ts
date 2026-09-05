/** Owns advanced aggregation, filter presentation state, commands, and derived results. */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  createEmptyAdvancedRecruitFilters,
  type AdvancedRecruitDataset,
  type AdvancedRecruitField,
  type AdvancedRecruitFilters,
  type AdvancedRecruitProgress,
  type AdvancedRecruitTextRule,
} from "../advanced.types";
import type {
  RecruitConfig,
  RecruitDetail,
  RecruitJob,
  RecruitSlotKey,
} from "../types";
import { loadAdvancedRecruitDataset } from "../api/advancedRecruitApi";
import { filterAdvancedRecruitItems } from "../utils/advancedRecruitFilter";
import { buildRecruitDutyChoices } from "../utils/recruitDutyGroups";
import { useListDetailScroll } from "../../../shared/hooks/useListDetailScroll";

export type AdvancedRecruitStatus = "idle" | "loading" | "ready" | "error";

export function useAdvancedRecruit(config: RecruitConfig | null) {
  const [status, setStatus] = useState<AdvancedRecruitStatus>("idle");
  const [dataset, setDataset] = useState<AdvancedRecruitDataset | null>(null);
  const [progress, setProgress] = useState<AdvancedRecruitProgress | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(createEmptyAdvancedRecruitFilters);
  const [selectedDetail, setSelectedDetail] = useState<RecruitDetail | null>(
    null,
  );
  const [dutyQuery, setDutyQuery] = useState("");
  const [dutyType, setDutyType] = useState("");
  const nextRuleId = useRef(1);
  const statusRef = useRef<AdvancedRecruitStatus>("idle");
  const controllerRef = useRef<AbortController | null>(null);
  const { captureListPosition, requestListPositionRestore } =
    useListDetailScroll(selectedDetail !== null);

  const jobsById = useMemo(
    () => new Map((config?.jobs ?? []).map((job) => [job.id, job] as const)),
    [config],
  );
  const filtering = useMemo(
    () => filterAdvancedRecruitItems(dataset?.items ?? [], filters, config),
    [dataset, filters, config],
  );
  const dutyOptions = useMemo(() => {
    const items = dataset?.items ?? [];
    const availableNames = new Set(items.map((item) => item.dutyName));
    const configured = buildRecruitDutyChoices(config?.duties ?? []).filter(
      (choice) => choice.dutyNames.some((name) => availableNames.has(name)),
    );
    const configuredNames = new Set(
      configured.flatMap((choice) => choice.dutyNames),
    );
    const fallback = items
      .filter((item) => !configuredNames.has(item.dutyName))
      .filter(
        (item, index, values) =>
          values.findIndex(
            (candidate) => candidate.dutyName === item.dutyName,
          ) === index,
      )
      .map((item) => ({
        label: item.dutyName,
        type: item.dutyType,
        dutyNames: [item.dutyName],
      }));
    return [...configured, ...fallback];
  }, [config, dataset]);
  const dutyTypes = useMemo(
    () => [...new Set(dutyOptions.map((option) => option.type))],
    [dutyOptions],
  );
  const visibleDutyOptions = useMemo(() => {
    const normalizedQuery = dutyQuery.trim().toLocaleLowerCase();
    return dutyOptions.filter(
      (option) =>
        (!dutyType || option.type === dutyType) &&
        (!normalizedQuery ||
          option.label.toLocaleLowerCase().includes(normalizedQuery)),
    );
  }, [dutyOptions, dutyQuery, dutyType]);
  const selectedDutyChoiceCount = useMemo(
    () =>
      dutyOptions.filter((option) =>
        option.dutyNames.every((name) => filters.dutyNames.includes(name)),
      ).length,
    [dutyOptions, filters.dutyNames],
  );
  const existingJobs = useMemo(
    () => relevantExistingJobs(dataset?.items ?? [], jobsById),
    [dataset, jobsById],
  );
  const missingJobs = useMemo(
    () => relevantMissingJobs(dataset?.items ?? [], jobsById),
    [dataset, jobsById],
  );

  const initialize = useCallback((force = false) => {
    if (
      !force &&
      (statusRef.current === "loading" || statusRef.current === "ready")
    ) {
      return;
    }
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    statusRef.current = "loading";
    setStatus("loading");
    setDataset(null);
    setProgress(null);
    setError(null);
    loadAdvancedRecruitDataset({
      signal: controller.signal,
      onProgress: setProgress,
    })
      .then((result) => {
        if (controller.signal.aborted) return;
        statusRef.current = "ready";
        setDataset(result);
        setStatus("ready");
      })
      .catch((reason) => {
        if (isAbortError(reason)) return;
        statusRef.current = "error";
        setError(readError(reason));
        setStatus("error");
      });
  }, []);
  const retryInitialization = useCallback(() => initialize(true), [initialize]);
  const toggleDutyChoice = useCallback((dutyNames: string[]) => {
    setFilters((current) => ({
      ...current,
      dutyNames: toggleSelectionGroup(current.dutyNames, dutyNames),
    }));
  }, []);
  const toggleExistingJob = useCallback((id: number) => {
    setFilters((current) => ({
      ...current,
      existingJobIds: toggleSelection(current.existingJobIds, id),
    }));
  }, []);
  const toggleOpenPosition = useCallback((position: RecruitSlotKey) => {
    setFilters((current) => ({
      ...current,
      openPositions: toggleSelection(current.openPositions, position),
    }));
  }, []);
  const toggleMissingJob = useCallback((id: number) => {
    setFilters((current) => ({
      ...current,
      missingJobIds: toggleSelection(current.missingJobIds, id),
    }));
  }, []);
  const setExistingJobMode = useCallback((mode: "any" | "all") => {
    setFilters((current) => ({ ...current, existingJobMode: mode }));
  }, []);
  const setOpenPositionMode = useCallback((mode: "any" | "all") => {
    setFilters((current) => ({ ...current, openPositionMode: mode }));
  }, []);
  const setMissingJobMode = useCallback((mode: "any" | "all") => {
    setFilters((current) => ({ ...current, missingJobMode: mode }));
  }, []);
  const setTextRuleMatchMode = useCallback((mode: "any" | "all") => {
    setFilters((current) => ({ ...current, textRuleMode: mode }));
  }, []);
  const addTextRule = useCallback(() => {
    const rule: AdvancedRecruitTextRule = {
      id: nextRuleId.current,
      mode: "keyword",
      pattern: "",
      fields: ["teamDetail", "recruitRequirements", "strategyDescription"],
    };
    nextRuleId.current += 1;
    setFilters((current) => ({
      ...current,
      textRules: [...current.textRules, rule],
    }));
  }, []);
  const removeTextRule = useCallback((id: number) => {
    setFilters((current) => ({
      ...current,
      textRules: current.textRules.filter((rule) => rule.id !== id),
    }));
  }, []);
  const setTextRuleKind = useCallback(
    (id: number, mode: AdvancedRecruitTextRule["mode"]) => {
      updateRule(setFilters, id, { mode });
    },
    [],
  );
  const setTextRulePattern = useCallback((id: number, pattern: string) => {
    updateRule(setFilters, id, { pattern });
  }, []);
  const toggleTextRuleField = useCallback(
    (id: number, field: AdvancedRecruitField) => {
      setFilters((current) => ({
        ...current,
        textRules: current.textRules.map((rule) =>
          rule.id === id
            ? { ...rule, fields: toggleSelection(rule.fields, field) }
            : rule,
        ),
      }));
    },
    [],
  );
  const patchFilters = useCallback((patch: Partial<AdvancedRecruitFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
  }, []);
  const clearFilters = useCallback(() => {
    setFilters(createEmptyAdvancedRecruitFilters());
    setDutyQuery("");
    setDutyType("");
  }, []);
  const openDetail = useCallback(
    (item: RecruitDetail) => {
      captureListPosition();
      setSelectedDetail(item);
    },
    [captureListPosition],
  );
  const closeDetail = useCallback(() => {
    requestListPositionRestore();
    setSelectedDetail(null);
  }, [requestListPositionRestore]);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    [],
  );

  return {
    patchFilters,
    config,
    status,
    dataset,
    progress,
    error,
    filters,
    filteredItems: filtering.items,
    ruleErrors: filtering.ruleErrors,
    dutyOptions: visibleDutyOptions,
    dutyTypes,
    dutyType,
    selectedDutyChoiceCount,
    dutyQuery,
    existingJobs,
    missingJobs,
    jobsById,
    selectedDetail,
    initialize,
    retryInitialization,
    setDutyQuery,
    setDutyType,
    toggleDutyChoice,
    toggleOpenPosition,
    toggleExistingJob,
    toggleMissingJob,
    setExistingJobMode,
    setOpenPositionMode,
    setMissingJobMode,
    setTextRuleMatchMode,
    addTextRule,
    removeTextRule,
    setTextRuleKind,
    setTextRulePattern,
    toggleTextRuleField,
    clearFilters,
    openDetail,
    closeDetail,
  };
}

export type AdvancedRecruitState = ReturnType<typeof useAdvancedRecruit>;

function toggleSelection<T>(values: T[], value: T) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function toggleSelectionGroup(values: string[], group: string[]) {
  const selected = new Set(values);
  if (group.every((value) => selected.has(value))) {
    return values.filter((value) => !group.includes(value));
  }
  group.forEach((value) => selected.add(value));
  return [...selected];
}

function updateRule(
  setFilters: Dispatch<SetStateAction<AdvancedRecruitFilters>>,
  id: number,
  change: Partial<AdvancedRecruitTextRule>,
) {
  setFilters((current) => ({
    ...current,
    textRules: current.textRules.map((rule) =>
      rule.id === id ? { ...rule, ...change } : rule,
    ),
  }));
}

function relevantExistingJobs(
  items: RecruitDetail[],
  jobsById: Map<number, RecruitJob>,
) {
  const ids = new Set(
    items.flatMap((item) =>
      item.slots
        .map((slot) => slot.jobId)
        .filter((id): id is number => id !== null),
    ),
  );
  return [...ids]
    .map((id) => jobsById.get(id))
    .filter((job): job is RecruitJob => Boolean(job));
}

function relevantMissingJobs(
  items: RecruitDetail[],
  jobsById: Map<number, RecruitJob>,
) {
  const jobs = new Map<number, RecruitJob>();
  items.forEach((item) =>
    item.needJobs.forEach((job) =>
      jobs.set(job.id, jobsById.get(job.id) ?? job),
    ),
  );
  return [...jobs.values()];
}

function readError(reason: unknown) {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === "string") return reason;
  return "高级招募数据聚合失败，请稍后重试";
}

function isAbortError(reason: unknown) {
  return reason instanceof DOMException && reason.name === "AbortError";
}
