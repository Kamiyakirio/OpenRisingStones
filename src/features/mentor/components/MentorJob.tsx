/** Accessible job label with a role-colored icon and a safe unknown fallback. */
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
    <span className={`mentor-job role-${job.role}`}>
      {job.iconUrl && job.iconUrl !== failedUrl && (
        <img
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
