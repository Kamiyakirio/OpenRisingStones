/** Recruitment cards and details share author, party, and job presentation. */
import clsx from "clsx";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDots,
  ChatCircleDots,
  Clock,
  MapPin,
  Path,
  ShieldCheck,
  WarningCircle,
} from "@phosphor-icons/react";
import { type ReactNode } from "react";
import { useRisingStonesAvatar } from "../../../shared/hooks/useRisingStonesAvatar";
import type {
  RecruitDetail,
  RecruitJob,
  RecruitSlot,
  RecruitSummary,
} from "../types";
import { RecruitDetailSkeleton, RecruitStatus } from "./RecruitFeedback";

/** Reused presentation strings stay static and are allocated once for this module. */
const cardLabelClasses =
  "inline-flex min-h-7 items-center rounded-control border border-tool bg-tool-soft px-2 text-xs font-medium text-tool";
const cardFactLabelClasses =
  "flex items-start gap-1.5 text-xs leading-5 text-muted";
const detailLabelClasses =
  "inline-flex min-h-7 items-center gap-[5px] rounded-control bg-hover px-2 py-0 text-xs font-bold text-muted [font-style:normal]";
const detailCopyClasses =
  "mx-0 mt-[15px] mb-0 text-sm leading-[1.85] wrap-anywhere whitespace-pre-wrap";
/** Nested copy panels use compact insets so the page gutter is not repeated inside each card. */
const detailCopyPanelClasses =
  "min-h-42.5 rounded-control border border-solid border-line p-5";
const strategyCopyPanelClasses = `strategy col-span-full ${detailCopyPanelClasses}`;
const jobBadgeClasses =
  "inline-flex min-h-7 items-center gap-[5px] rounded-control bg-[color-mix(_in_srgb,_var(--ors-color-accent)_7%,_var(--ors-color-surface)_)] px-2 py-0 text-xs font-bold text-accent [font-style:normal] [border:1px_solid_color-mix(in_srgb,_var(--ors-color-accent)_38%,_var(--ors-color-line))] first:text-xs first:text-muted";

export function RecruitCard({
  item,
  jobsById,
  onOpen,
}: {
  item: RecruitSummary;
  jobsById: Map<number, RecruitJob>;
  onOpen: () => void;
}) {
  // Independent content groups keep party slots from stretching with identity rows.
  return (
    <article
      className="recruit-card grid min-w-0 cursor-pointer items-start gap-4 rounded-panel border border-line bg-surface p-5 transition-colors hover:border-accent hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-accent max-[519px]:p-4 min-[768px]:grid-cols-2 min-[1200px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(320px,1.2fr)] min-[1200px]:gap-x-6"
      role="button"
      tabIndex={0}
      aria-label={`查看 ${item.dutyName} 招募详情`}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onOpen();
      }}
    >
      <div className="grid min-w-0 content-start gap-4">
        <div className="recruit-card-title min-w-0">
          <span className="text-xs font-semibold text-accent">
            {item.dutyType}
          </span>
          <h3 className="mt-1 text-lg leading-snug font-semibold break-words">
            {item.dutyName}
          </h3>
        </div>
        <header className="recruit-card-owner flex min-w-0 items-start gap-3">
          <Avatar item={item} />
          <div className="grid min-w-0 gap-1">
            <strong className="truncate text-sm font-semibold">
              {item.author}
            </strong>
            <span className="text-xs text-muted">
              {item.areaName} / {item.groupName}
            </span>
            <span className="recruit-card-updated text-xs text-muted">
              {formatUpdatedAt(item.updatedAt)}
            </span>
          </div>
        </header>
        {(item.labels.length > 0 || item.customLabel) && (
          <div
            className="recruit-card-labels flex flex-wrap gap-1.5"
            aria-label="招募标签"
          >
            {item.labels.map((label) => (
              <span
                className={cardLabelClasses}
                key={`${item.id}-${label.id}-${label.name}`}
              >
                {label.name}
              </span>
            ))}
            {item.customLabel && (
              <span className={cardLabelClasses}>{item.customLabel}</span>
            )}
          </div>
        )}
      </div>
      <dl className="recruit-card-facts m-0 mt-8 grid min-w-0 content-start gap-3 text-sm">
        <div className="grid grid-cols-[76px_minmax(0,1fr)] gap-2">
          <dt className={cardFactLabelClasses}>
            <Clock className="mt-0.5 size-3.5 shrink-0 text-accent" />
            活动时间
          </dt>
          <dd className="min-w-0 text-xs leading-5 break-words">
            {item.schedule}
          </dd>
        </div>
        <div className="grid grid-cols-[76px_minmax(0,1fr)] gap-2">
          <dt className={cardFactLabelClasses}>
            <Path className="mt-0.5 size-3.5 shrink-0 text-accent" />
            当前进度
          </dt>
          <dd className="min-w-0 text-xs leading-5 break-words">
            {item.progress}
          </dd>
        </div>
        <div className="grid grid-cols-[76px_minmax(0,1fr)] gap-2">
          <dt className={cardFactLabelClasses}>
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-accent" />
            攻略方式
          </dt>
          <dd className="min-w-0 text-xs leading-5 break-words">
            {item.strategy}
          </dd>
        </div>
      </dl>
      <div className="mt-6 grid min-w-0 content-start gap-3 min-[768px]:max-[1199px]:col-span-2">
        <PartyComposition slots={item.slots} jobsById={jobsById} />
        <div className="recruit-card-needs min-w-0">
          <JobList jobs={item.needJobs} />
        </div>
      </div>
      <footer className="recruit-card-footer flex min-w-0 items-center justify-between gap-3 border-t border-line pt-3 text-xs text-muted min-[768px]:col-span-2 min-[1200px]:col-span-3">
        <span className="inline-flex items-center gap-1.5">
          <ChatCircleDots className="size-3.5" />
          {item.responseCount} 人已响应
        </span>
        <span
          className="recruit-card-detail-action inline-flex shrink-0 items-center gap-1.5 font-semibold text-accent"
          aria-hidden="true"
        >
          查看详情
          <ArrowRight className="size-3.5" weight="bold" />
        </span>
      </footer>
    </article>
  );
}
export function RecruitDetailView({
  summary,
  detail,
  loading,
  error,
  jobsById,
  onBack,
  onRetry,
}: {
  summary: RecruitSummary;
  detail: RecruitDetail | null;
  loading: boolean;
  error: string | null;
  jobsById: Map<number, RecruitJob>;
  onBack: () => void;
  onRetry: () => void;
}) {
  const item = detail ?? summary;
  // Shrinkable grid tracks and wrapped copy keep long public records inside the page shell.
  return (
    <main className="recruit-detail-page mx-auto w-full max-w-330 p-5 max-[760px]:px-4 max-[760px]:pt-6.5 max-[760px]:pb-12">
      <button
        className="recruit-detail-back mb-4.5 inline-flex min-h-10 items-center justify-center gap-[7px] rounded-control border border-solid border-line bg-surface px-[13px] py-0 text-xs font-[720] whitespace-nowrap text-muted [transition:transform_160ms_ease,_border-color_160ms_ease,_background-color_160ms_ease] hover:border-accent hover:text-ink"
        type="button"
        onClick={onBack}
      >
        <ArrowLeft className="h-[15px] w-[15px]" weight="bold" />
        返回招募
      </button>
      <article className="recruit-detail-shell overflow-hidden rounded-control border border-solid border-line bg-surface shadow-[none]">
        <header className="recruit-detail-hero grid grid-cols-[minmax(0,_0.85fr)_minmax(0,_1.15fr)] border-b border-solid border-line max-[760px]:grid-cols-1">
          <div className="recruit-detail-owner flex min-w-0 items-center gap-4 bg-[color-mix(_in_srgb,_var(--ors-color-accent)_7%,_var(--ors-color-canvas)_)] p-6 max-[760px]:border-b max-[760px]:border-solid max-[760px]:border-line">
            <Avatar item={item} large layout="detail-owner" />
            <div className="min-w-0">
              <span className="text-xs text-muted">招募发布者</span>
              <strong className="mt-[5px] block overflow-hidden text-[21px] text-ellipsis whitespace-nowrap">
                {item.author}
              </strong>
              <p className="mx-0 mt-[7px] mb-0 flex items-center gap-[5px] text-xs text-muted">
                <MapPin
                  className="h-[13px] w-[13px] text-accent"
                  weight="fill"
                />
                {item.areaName} / {item.groupName}
              </p>
            </div>
          </div>
          <div className="recruit-detail-title min-w-0 p-6">
            <span className="text-xs font-[780] text-accent">
              {item.dutyType}
            </span>
            <h1 className="mx-0 mt-[7px] mb-0 max-w-[24ch] text-2xl leading-[1.5] font-bold tracking-normal wrap-anywhere">
              {item.dutyName}
            </h1>
            <p className="mx-0 mt-[11px] mb-0 text-xs text-muted">
              {item.teamComposition}
            </p>
            {(item.labels.length > 0 || item.customLabel) && (
              <div
                className="recruit-card-labels col-[1_/_3] m-0 mt-[17px] flex flex-wrap items-center gap-1.5"
                aria-label="招募标签"
              >
                {item.labels.map((label) => (
                  <span
                    className={detailLabelClasses}
                    key={`${item.id}-${label.id}-${label.name}`}
                  >
                    {label.name}
                  </span>
                ))}
                {item.customLabel && (
                  <span className={detailLabelClasses}>{item.customLabel}</span>
                )}
              </div>
            )}
          </div>
        </header>

        {loading ? (
          <RecruitDetailSkeleton />
        ) : error ? (
          <RecruitStatus
            icon={
              <WarningCircle
                className="h-10.5 w-10.5 text-accent"
                weight="duotone"
              />
            }
            title="详情暂时无法读取"
            description="请重新加载。"
            technicalDetails={error}
            action="重新加载"
            onAction={onRetry}
          />
        ) : detail ? (
          <div className="recruit-detail-content grid grid-cols-1 gap-6 p-6 max-[460px]:p-4">
            <section
              className="recruit-detail-composition rounded-control border border-solid border-line bg-canvas p-5"
              aria-labelledby="party-title"
            >
              <header className="mb-4.5 flex items-start justify-between gap-6 max-[760px]:flex-col">
                <div>
                  <h2 className="m-0 text-base font-semibold" id="party-title">
                    队伍编成
                  </h2>
                  <p className="m-0 mt-1 text-xs text-muted">
                    空缺位置与当前职业
                  </p>
                </div>
                <JobList jobs={detail.needJobs} />
              </header>
              <PartyComposition
                slots={detail.slots}
                jobsById={jobsById}
                expanded
              />
            </section>

            <div className="recruit-detail-facts grid grid-cols-3 gap-3 max-[760px]:grid-cols-1">
              <DetailFact
                icon={<CalendarDots className="h-[17px] w-[17px]" />}
                label="活动时间"
              >
                {detail.schedule}
              </DetailFact>
              <DetailFact
                icon={<Path className="h-[17px] w-[17px]" />}
                label="当前进度"
              >
                {detail.progress}
              </DetailFact>
              <DetailFact
                icon={<ShieldCheck className="h-[17px] w-[17px]" />}
                label="攻略方式"
              >
                {detail.strategy}
              </DetailFact>
            </div>

            <section className="recruit-detail-copy grid grid-cols-[minmax(0,_1.1fr)_minmax(0,_0.9fr)] gap-3 max-[760px]:grid-cols-1">
              <div className={detailCopyPanelClasses}>
                <h2 className="m-0 text-base font-semibold text-accent">
                  队伍说明
                </h2>
                <p className={detailCopyClasses}>{detail.teamDetail}</p>
              </div>
              <div className={detailCopyPanelClasses}>
                <h2 className="m-0 text-base font-semibold text-accent">
                  招募要求
                </h2>
                <p className={detailCopyClasses}>
                  {detail.recruitRequirements}
                </p>
              </div>
              <div className={strategyCopyPanelClasses}>
                <h2 className="m-0 text-base font-semibold text-accent">
                  攻略说明
                </h2>
                <p className={detailCopyClasses}>
                  {detail.strategyDescription}
                </p>
              </div>
            </section>
          </div>
        ) : null}
      </article>
    </main>
  );
}
function DetailFact({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start gap-[11px] rounded-control bg-hover p-4">
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-control bg-surface text-accent"
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="m-0 text-xs text-muted">{label}</dt>
        <dd className="m-0 mt-[5px] text-xs leading-[1.5] font-semibold wrap-anywhere">
          {children}
        </dd>
      </div>
    </div>
  );
}
function PartyComposition({
  slots,
  jobsById,
  expanded = false,
}: {
  slots: RecruitSlot[];
  jobsById: Map<number, RecruitJob>;
  expanded?: boolean;
}) {
  return (
    <div
      className={clsx(
        "party-composition grid min-w-0 content-start items-start gap-1.5",
        expanded
          ? "expanded grid-cols-2 min-[480px]:grid-cols-4 min-[1120px]:grid-cols-8"
          : "grid-cols-4 min-[640px]:grid-cols-8",
      )}
      aria-label="当前队伍编成"
    >
      {slots.map((slot) => {
        const job = slot.jobId ? jobsById.get(slot.jobId) : undefined;
        return (
          <span
            className={clsx(
              "group/flex flex min-w-0 flex-col items-center justify-center gap-1 rounded-control border border-line data-[role=damage]:border-danger data-[role=healer]:border-success data-[role=tank]:border-info [&.filled[data-role=damage]]:bg-danger-soft [&.filled[data-role=healer]]:bg-success-soft [&.filled[data-role=tank]]:bg-info-soft",
              expanded ? "min-h-25 px-1 py-2" : "h-14 px-1 py-1",
              job ? "filled bg-canvas" : "vacant border-dashed bg-hover",
            )}
            key={`${slot.alliance ?? ""}-${slot.key}`}
            data-role={
              slot.key.startsWith("H")
                ? "healer"
                : slot.key.startsWith("D")
                  ? "damage"
                  : "tank"
            }
            title={job ? `${slot.key} ${job.name}` : `${slot.key} 空缺`}
          >
            <small className="text-xs font-semibold text-muted group-data-[role=damage]/flex:text-danger group-data-[role=healer]/flex:text-success group-data-[role=tank]/flex:text-info">
              {slot.alliance ? `${slot.alliance}-${slot.key}` : slot.key}
            </small>
            {job?.icon ? (
              <img
                className={
                  expanded
                    ? "size-9 shrink-0 object-contain"
                    : "size-5 shrink-0 object-contain"
                }
                src={job.icon}
                alt=""
                width="28"
                height="28"
              />
            ) : (
              <strong
                className={
                  expanded
                    ? "grid size-9 place-items-center text-base font-medium text-muted"
                    : "grid size-5 place-items-center text-base font-medium text-muted"
                }
              >
                {job?.name.slice(0, 1) ?? "+"}
              </strong>
            )}
            {expanded && (
              <em className="w-full truncate text-center text-xs font-medium text-ink not-italic">
                {job?.name ?? "空缺"}
              </em>
            )}
          </span>
        );
      })}
    </div>
  );
}
function JobList({ jobs }: { jobs: RecruitJob[] }) {
  if (!jobs.length)
    return (
      <span className="recruit-needs-any inline-flex min-h-7 items-center gap-[5px] rounded-control bg-[color-mix(_in_srgb,_var(--ors-color-accent)_7%,_var(--ors-color-surface)_)] px-2 py-0 text-xs font-bold text-accent [font-style:normal] [border:1px_solid_color-mix(in_srgb,_var(--ors-color-accent)_38%,_var(--ors-color-line))]">
        职业不限
      </span>
    );
  return (
    <div className="recruit-job-list flex flex-wrap items-center gap-1.5">
      <span className={jobBadgeClasses}>招募职业</span>
      {jobs.map((job) => (
        <span
          className={jobBadgeClasses}
          key={`${job.id}-${job.name}`}
          title={job.category}
        >
          {job.icon && (
            <img
              className="h-5 w-5 object-contain"
              src={job.icon}
              alt=""
              width="20"
              height="20"
            />
          )}
          {job.name}
        </span>
      ))}
    </div>
  );
}
function Avatar({
  item,
  large = false,
  layout,
}: {
  item: RecruitSummary;
  large?: boolean;
  /** Explicit layout variants keep this component independent of ancestor classes. */
  layout?: "detail-owner";
}) {
  const avatar = useRisingStonesAvatar(item.avatar);
  return (
    <span
      className={clsx(
        `recruit-avatar relative grid h-8 w-8 flex-[0_0_auto] place-items-center overflow-hidden rounded-control border border-solid border-line bg-selected text-[15px] font-extrabold text-accent ${large ? "large h-18 w-18 rounded-control text-[24px]" : ""}`,
        layout === "detail-owner" && "text-xs text-muted",
      )}
      aria-hidden="true"
    >
      <span
        className={clsx(
          "grid h-full w-full place-items-center",
          layout === "detail-owner" && "text-xs text-muted",
        )}
      >
        {item.author.slice(0, 1)}
      </span>
      {avatar.source && (
        <img
          className="absolute inset-0 h-full w-full object-cover"
          src={avatar.source}
          alt=""
          width={large ? 72 : 42}
          height={large ? 72 : 42}
          onError={avatar.markFailed}
        />
      )}
    </span>
  );
}
function formatUpdatedAt(value: string) {
  if (!value) return "更新时间未知";
  const normalized = value.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
