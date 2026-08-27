/** Shared classification for upstream recruitment throttling and bot challenges. */
export class RecruitRateLimitError extends Error {
  constructor(message = "石之家招募接口触发访问频控") {
    super(message);
    this.name = "RecruitRateLimitError";
  }
}

export function isRecruitRateLimitError(reason: unknown) {
  return (
    reason instanceof RecruitRateLimitError ||
    rateLimitMessage(readReasonMessage(reason))
  );
}

export function readReasonMessage(reason: unknown) {
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
  return "";
}

export function rateLimitMessage(message: string) {
  return /(?:HTTP\s*(?:403|429)|频控|限流|请求频繁|操作频繁|访问验证|稍后重试|too many requests|rate.?limit|automatic verification|challenge)/iu.test(
    message,
  );
}
