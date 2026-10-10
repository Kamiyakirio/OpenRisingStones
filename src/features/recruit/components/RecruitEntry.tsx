/** Recruitment cards and details share author, party, and job presentation. */
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
      className="recruit-card grid min-w-0 cursor-pointer items-start gap-4 rounded-xl border border-line bg-surface p-5 transition-colors hover:border-accent hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-accent max-[519px]:p-4 min-[768px]:grid-cols-2 min-[1200px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(320px,1.2fr)] min-[1200px]:gap-x-6"
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
          <h3 className="mt-1 text-lg font-semibold leading-snug break-words">
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
                className="inline-flex min-h-7 items-center rounded-lg border border-tool bg-tool-soft px-2 text-xs font-medium text-tool"
                key={`${item.id}-${label.id}-${label.name}`}
              >
                {label.name}
              </span>
            ))}
            {item.customLabel && (
              <span className="inline-flex min-h-7 items-center rounded-lg border border-tool bg-tool-soft px-2 text-xs font-medium text-tool">
                {item.customLabel}
              </span>
            )}
          </div>
        )}
      </div>
      <dl className="recruit-card-facts m-0 grid min-w-0 content-start gap-3 text-sm [&_>_div]:grid [&_>_div]:grid-cols-[76px_minmax(0,1fr)] [&_>_div]:gap-2 [&_dt]:flex [&_dt]:items-start [&_dt]:gap-1.5 [&_dt]:text-xs [&_dt]:leading-5 [&_dt]:text-muted [&_dt_svg]:mt-0.5 [&_dt_svg]:size-3.5 [&_dt_svg]:shrink-0 [&_dt_svg]:text-accent [&_dd]:min-w-0 [&_dd]:text-xs [&_dd]:leading-5 [&_dd]:break-words">
        <div>
          <dt>
            <Clock />
            活动时间
          </dt>
          <dd>{item.schedule}</dd>
        </div>
        <div>
          <dt>
            <Path />
            当前进度
          </dt>
          <dd>{item.progress}</dd>
        </div>
        <div>
          <dt>
            <ShieldCheck />
            攻略方式
          </dt>
          <dd>{item.strategy}</dd>
        </div>
      </dl>
      <div className="grid min-w-0 content-start gap-3 min-[768px]:max-[1199px]:col-span-2">
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
  return (
    <main
      className={
        "mx-auto w-full max-w-[1600px] px-5 py-5 max-[899px]:px-4 max-[899px]:py-4 max-[519px]:px-3 max-[519px]:py-4 recruit-detail-page max-[1199px]:px-[24px] max-[767px]:px-[16px] [&&&&]:w-[min(1320px,_100%)] [&&&&]:m-[0_auto] [&&&&]:p-[20px_20px] [@media(max-width:_760px)]:[&&&&]:p-[26px_16px_48px]"
      }
    >
      <button
        className={
          "recruit-detail-back inline-flex justify-center items-center gap-[7px] whitespace-nowrap [&_svg]:w-[15px] [&_svg]:h-[15px] min-h-[40px] mb-[18px] border border-solid border-line rounded-[var(--ors-radius-control)] text-muted bg-surface text-xs [&:hover]:border-accent [&:hover]:text-ink [&&&&]:[transition:transform_160ms_ease,_border-color_160ms_ease,_background-color_160ms_ease] [&&&&]:p-[0_13px] [&&&&]:[font-weight:720]"
        }
        type="button"
        onClick={onBack}
      >
        <ArrowLeft weight="bold" />
        返回招募
      </button>
      <article
        className={
          "recruit-detail-shell overflow-hidden border border-solid border-line rounded-[var(--ors-radius-control)] bg-surface [&&&&]:shadow-[none]"
        }
      >
        <header
          className={
            "recruit-detail-hero grid border-b border-solid border-line p-[24px] [&&&&]:grid-cols-[minmax(280px,_0.75fr)_minmax(0,_1.25fr)] [@media(max-width:_760px)]:[&&&&]:grid-cols-[1fr]"
          }
        >
          <div
            className={
              "recruit-detail-owner flex items-center gap-[16px] [&_>_div]:min-w-0 [&_span]:text-muted [&_span]:text-xs [&_p]:text-muted [&_p]:text-xs [&_strong]:block [&_strong]:mt-[5px] [&_strong]:overflow-hidden [&_strong]:whitespace-nowrap [&_p]:flex [&_p]:items-center [&_p]:gap-[5px] [&_p_svg]:w-[13px] [&_p_svg]:h-[13px] [&_p_svg]:text-accent max-[760px]:p-[24px] max-[760px]:border-b max-[760px]:border-solid max-[760px]:border-line [&&&&]:p-[clamp(26px,_4vw,_44px)] [&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_7%,_var(--ors-color-canvas)_)] [&&&&_strong]:text-[21px] [&&&&_strong]:[text-overflow:ellipsis] [&&&&_p]:m-[7px_0_0]"
            }
          >
            <Avatar item={item} large />
            <div>
              <span>招募发布者</span>
              <strong>{item.author}</strong>
              <p>
                <MapPin weight="fill" />
                {item.areaName} / {item.groupName}
              </p>
            </div>
          </div>
          <div
            className={
              "recruit-detail-title [&_>_span]:text-accent [&_>_span]:text-xs min-w-0 [&_h1]:text-2xl [&_>_p]:text-muted [&_>_p]:text-xs max-[760px]:p-[24px] [&&&&_>_span]:[font-weight:780] [&&&&]:p-[clamp(26px,_4vw,_44px)] [&&&&_h1]:max-w-[24ch] [&&&&_h1]:m-[7px_0_0] [&&&&_h1]:leading-[1.5] [&&&&_h1]:[letter-spacing:normal] [&&&&_>_p]:m-[11px_0_0]"
            }
          >
            <span>{item.dutyType}</span>
            <h1 className="text-2xl font-bold tracking-tight">
              {item.dutyName}
            </h1>
            <p>{item.teamComposition}</p>
            {(item.labels.length > 0 || item.customLabel) && (
              <div
                className={
                  "recruit-card-labels flex items-center flex-wrap gap-[6px] [&_>_span]:inline-flex [&_>_span]:items-center [&_>_span]:gap-[5px] [&_>_span]:min-h-[28px] [&_>_span]:rounded-[var(--ors-radius-control)] [&_>_span]:text-xs [&_>_span]:font-bold mt-[13px] m-0 [&_>_span]:text-muted [&_>_span]:bg-hover [.recruit-detail-title_&]:mt-[17px] [&&&&_>_span]:p-[0_8px] [&&&&_>_span]:[font-style:normal] [&&&&]:[grid-column:1_/_3]"
                }
                aria-label="招募标签"
              >
                {item.labels.map((label) => (
                  <span key={`${item.id}-${label.id}-${label.name}`}>
                    {label.name}
                  </span>
                ))}
                {item.customLabel && <span>{item.customLabel}</span>}
              </div>
            )}
          </div>
        </header>

        {loading ? (
          <RecruitDetailSkeleton />
        ) : error ? (
          <RecruitStatus
            icon={<WarningCircle weight="duotone" />}
            title="详情暂时无法读取"
            description="请重新加载。"
            technicalDetails={error}
            action="重新加载"
            onAction={onRetry}
          />
        ) : detail ? (
          <div
            className={
              "recruit-detail-content grid gap-[28px] max-[460px]:p-[16px] [&&&&]:p-[clamp(24px,_4vw,_44px)]"
            }
          >
            <section
              className={
                "recruit-detail-composition p-[22px] border border-solid border-line rounded-[var(--ors-radius-control)] bg-canvas [&_>_header]:flex [&_>_header]:justify-between [&_>_header]:gap-[24px] [&_>_header]:mb-[18px] [&_h2]:m-0 [&_p]:m-0 [&_p]:mt-[4px] [&_p]:text-muted [&_p]:text-xs max-[760px]:[&_>_header]:flex-col [&&&&_>_header]:[align-items:start] [&&&&_h2]:text-[16px]"
              }
              aria-labelledby="party-title"
            >
              <header>
                <div>
                  <h2 className="text-lg font-semibold" id="party-title">
                    队伍编成
                  </h2>
                  <p>空缺位置与当前职业</p>
                </div>
                <JobList jobs={detail.needJobs} />
              </header>
              <PartyComposition
                slots={detail.slots}
                jobsById={jobsById}
                expanded
              />
            </section>

            <div
              className={
                "recruit-detail-facts grid gap-[12px] [&_>_div]:flex [&_>_div]:items-start [&_>_div]:gap-[11px] [&_>_div]:min-w-0 [&_>_div]:p-[16px] [&_>_div]:rounded-[var(--ors-radius-control)] [&_>_div]:bg-hover [&_>_div_>_span]:grid [&_>_div_>_span]:place-items-center [&_>_div_>_span]:w-[32px] [&_>_div_>_span]:h-[32px] [&_>_div_>_span]:rounded-[var(--ors-radius-control)] [&_>_div_>_span]:text-accent [&_>_div_>_span]:bg-surface [&_svg]:w-[17px] [&_svg]:h-[17px] [&_dt]:m-0 [&_dd]:m-0 [&_dt]:text-muted [&_dt]:text-xs [&_dd]:mt-[5px] [&_dd]:font-semibold [&&&&]:grid-cols-[repeat(3,_minmax(0,_1fr))] [&&&&_>_div_>_span]:flex-[0_0_auto] [&&&&_dd]:text-[12px] [&&&&_dd]:leading-[1.5] [@media(max-width:_760px)]:[&&&&]:grid-cols-[1fr]"
              }
            >
              <DetailFact icon={<CalendarDots />} label="活动时间">
                {detail.schedule}
              </DetailFact>
              <DetailFact icon={<Path />} label="当前进度">
                {detail.progress}
              </DetailFact>
              <DetailFact icon={<ShieldCheck />} label="攻略方式">
                {detail.strategy}
              </DetailFact>
            </div>

            <section
              className={
                "recruit-detail-copy grid gap-[12px] [&_>_div]:min-h-[170px] [&_>_div]:border [&_>_div]:border-solid [&_>_div]:border-line [&_>_div]:rounded-[var(--ors-radius-control)] [&_h2]:m-0 [&_h2]:text-accent [&_p]:text-sm [&_p]:whitespace-pre-wrap [&&&&_h2]:text-[16px] [&&&&]:grid-cols-[1.1fr_0.9fr] [&&&&_>_div]:p-[clamp(20px,_3vw,_30px)] [&&&&_p]:m-[15px_0_0] [&&&&_p]:leading-[1.85] [@media(max-width:_760px)]:[&&&&]:grid-cols-[1fr]"
              }
            >
              <div>
                <h2 className="text-lg font-semibold">队伍说明</h2>
                <p>{detail.teamDetail}</p>
              </div>
              <div>
                <h2 className="text-lg font-semibold">招募要求</h2>
                <p>{detail.recruitRequirements}</p>
              </div>
              <div
                className={
                  "strategy [.recruit-detail-copy_>_&]:min-h-[120px] [.recruit-detail-copy_>_&&&&]:[grid-column:1_/_-1]"
                }
              >
                <h2 className="text-lg font-semibold">攻略说明</h2>
                <p>{detail.strategyDescription}</p>
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
    <div>
      <span aria-hidden="true">{icon}</span>
      <div>
        <dt>{label}</dt>
        <dd>{children}</dd>
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
      className={`party-composition grid min-w-0 content-start items-start gap-1.5 ${expanded ? "expanded grid-cols-2 min-[480px]:grid-cols-4 min-[1120px]:grid-cols-8" : "grid-cols-4 min-[640px]:grid-cols-8"}`}
      aria-label="当前队伍编成"
    >
      {slots.map((slot) => {
        const job = slot.jobId ? jobsById.get(slot.jobId) : undefined;
        return (
          <span
            className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg border border-line [&[data-role=tank]]:border-info [&[data-role=healer]]:border-success [&[data-role=damage]]:border-danger [&[data-role=tank]_small]:text-info [&[data-role=healer]_small]:text-success [&[data-role=damage]_small]:text-danger [&.filled[data-role=tank]]:bg-info-soft [&.filled[data-role=healer]]:bg-success-soft [&.filled[data-role=damage]]:bg-danger-soft ${expanded ? "min-h-25 px-1 py-2" : "h-14 px-1 py-1"} ${job ? "filled bg-canvas" : "vacant border-dashed bg-hover"}`}
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
            <small className="text-xs font-semibold text-muted">
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
              <em className="w-full truncate text-center text-xs font-medium not-italic text-ink">
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
      <span
        className={
          "recruit-needs-any inline-flex items-center gap-[5px] min-h-[28px] rounded-[var(--ors-radius-control)] text-xs font-bold text-accent [&&&&]:p-[0_8px] [&&&&]:[font-style:normal] [&&&&]:[border:1px_solid_color-mix(in_srgb,_var(--ors-color-accent)_38%,_var(--ors-color-line))] [&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_7%,_var(--ors-color-surface)_)]"
        }
      >
        职业不限
      </span>
    );
  return (
    <div
      className={
        "recruit-job-list flex items-center flex-wrap gap-[6px] [&_>_h2]:m-0 [&_>_span]:inline-flex [&_>_span]:items-center [&_>_span]:gap-[5px] [&_>_span]:min-h-[28px] [&_>_span]:rounded-[var(--ors-radius-control)] [&_>_span]:text-xs [&_>_span]:font-bold [&_>_span]:text-accent [&_img]:w-[20px] [&_img]:h-[20px] [&_img]:object-contain [&_>_span:first-child]:text-muted [&_>_span:first-child]:text-xs [&&&&_>_h2]:text-[15px] [&&&&_>_span]:p-[0_8px] [&&&&_>_span]:[font-style:normal] [&&&&_>_span]:[border:1px_solid_color-mix(in_srgb,_var(--ors-color-accent)_38%,_var(--ors-color-line))] [&&&&_>_span]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_7%,_var(--ors-color-surface)_)]"
      }
    >
      <span>招募职业</span>
      {jobs.map((job) => (
        <span key={`${job.id}-${job.name}`} title={job.category}>
          {job.icon && <img src={job.icon} alt="" width="20" height="20" />}
          {job.name}
        </span>
      ))}
    </div>
  );
}

function Avatar({
  item,
  large = false,
}: {
  item: RecruitSummary;
  large?: boolean;
}) {
  const avatar = useRisingStonesAvatar(item.avatar);
  return (
    <span
      className={`[&&&&]:flex-[0_0_auto] [&&&&]:text-[15px] [&&&&_img]:inset-[0] relative grid place-items-center overflow-hidden border border-solid border-line rounded-[var(--ors-radius-control)] text-accent bg-selected font-extrabold w-[32px] h-[32px] [&_>_span]:grid [&_>_span]:place-items-center [&_>_span]:w-full [&_>_span]:h-full [&_img]:absolute [&_img]:w-full [&_img]:h-full [&_img]:object-cover recruit-avatar ${large ? "large [.recruit-avatar&]:w-[72px] [.recruit-avatar&]:h-[72px] [.recruit-avatar&]:rounded-[var(--ors-radius-control)] [.recruit-avatar&&&&]:text-[24px]" : ""}`}
      aria-hidden="true"
    >
      <span>{item.author.slice(0, 1)}</span>
      {avatar.source && (
        <img
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
