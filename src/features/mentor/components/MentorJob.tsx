/** Accessible job label with a role-colored icon and a safe unknown fallback. */
import clsx from "clsx";
import { useState } from "react";
import { resolveMentorJob } from "../utils/jobs";
export function MentorJob({
  jobId,
  jobName,
}: {
  jobId: number | null;
  jobName: string | null;
}) {
  const job = resolveMentorJob(jobId, jobName);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return (
    <span
      className={clsx(
        "mentor-job inline-flex min-w-0 items-center gap-1.5 text-muted [&.role-dps]:text-danger [&.role-healer]:text-success [&.role-tank]:text-info",
        `role-${job.role}`,
      )}
    >
      {job.iconUrl && job.iconUrl !== failedUrl && (
        <img
          className="flex-none object-contain"
          src={job.iconUrl}
          alt=""
          width={22}
          height={22}
          loading="lazy"
          onError={() => setFailedUrl(job.iconUrl)}
        />
      )}
      <span>{job.label || "职业未记录"}</span>
    </span>
  );
}
