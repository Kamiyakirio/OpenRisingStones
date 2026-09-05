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
  return (
    <article
      className="recruit-card"
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
      <header className="recruit-card-owner">
        <Avatar item={item} />
        <div>
          <strong>{item.author}</strong>
          <span>
            {item.areaName} / {item.groupName}
          </span>
        </div>
        <span className="recruit-card-updated">
          {formatUpdatedAt(item.updatedAt)}
        </span>
      </header>
      <div className="recruit-card-title">
        <span>{item.dutyType}</span>
        <h3>{item.dutyName}</h3>
      </div>
      <dl className="recruit-card-facts">
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
      <PartyComposition slots={item.slots} jobsById={jobsById} />
      <div className="recruit-card-needs">
        <span>正在寻找</span>
        <JobList jobs={item.needJobs} />
      </div>
      {(item.labels.length > 0 || item.customLabel) && (
        <div className="recruit-card-labels" aria-label="招募标签">
          {item.labels.map((label) => (
            <span key={`${item.id}-${label.id}-${label.name}`}>
              {label.name}
            </span>
          ))}
          {item.customLabel && <span>{item.customLabel}</span>}
        </div>
      )}
      <footer className="recruit-card-footer">
        <span>
          <ChatCircleDots />
          {item.responseCount} 人已响应
        </span>
        <span className="recruit-card-detail-action" aria-hidden="true">
          查看详情
          <ArrowRight weight="bold" />
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
    <main className="recruit-detail-page">
      <button className="recruit-detail-back" type="button" onClick={onBack}>
        <ArrowLeft weight="bold" />
        返回招募
      </button>
      <article className="recruit-detail-shell">
        <header className="recruit-detail-hero">
          <div className="recruit-detail-owner">
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
          <div className="recruit-detail-title">
            <span>{item.dutyType}</span>
            <h1>{item.dutyName}</h1>
            <p>{item.teamComposition}</p>
            {(item.labels.length > 0 || item.customLabel) && (
              <div className="recruit-card-labels" aria-label="招募标签">
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
            description={error}
            action="重新加载"
            onAction={onRetry}
          />
        ) : detail ? (
          <div className="recruit-detail-content">
            <section
              className="recruit-detail-composition"
              aria-labelledby="party-title"
            >
              <header>
                <div>
                  <h2 id="party-title">队伍编成</h2>
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

            <div className="recruit-detail-facts">
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

            <section className="recruit-detail-copy">
              <div>
                <h2>队伍说明</h2>
                <p>{detail.teamDetail}</p>
              </div>
              <div>
                <h2>招募要求</h2>
                <p>{detail.recruitRequirements}</p>
              </div>
              <div className="strategy">
                <h2>攻略说明</h2>
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
      className={`party-composition ${expanded ? "expanded" : ""}`}
      aria-label="当前队伍编成"
    >
      {slots.map((slot) => {
        const job = slot.jobId ? jobsById.get(slot.jobId) : undefined;
        return (
          <span
            className={job ? "filled" : "vacant"}
            key={`${slot.alliance ?? ""}-${slot.key}`}
            title={job ? `${slot.key} ${job.name}` : `${slot.key} 空缺`}
          >
            <small>
              {slot.alliance ? `${slot.alliance}-${slot.key}` : slot.key}
            </small>
            {job?.icon ? (
              <img src={job.icon} alt="" width="28" height="28" />
            ) : (
              <strong>{job?.name.slice(0, 1) ?? "+"}</strong>
            )}
            {expanded && <em>{job?.name ?? "空缺"}</em>}
          </span>
        );
      })}
    </div>
  );
}

function JobList({ jobs }: { jobs: RecruitJob[] }) {
  if (!jobs.length) return <span className="recruit-needs-any">职业不限</span>;
  return (
    <div className="recruit-job-list">
      <h2>当前招募职业：</h2>
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
      className={`recruit-avatar ${large ? "large" : ""}`}
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
