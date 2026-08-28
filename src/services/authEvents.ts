/** Shared authentication-expiry signal for protected Stone API consumers. */
export const SDO_AUTHENTICATION_REQUIRED_EVENT =
  "sdo://authentication-required";

export class SdoAuthenticationRequiredError extends Error {
  constructor() {
    super("石之家登录已失效，请重新登录");
    this.name = "SdoAuthenticationRequiredError";
  }
}

export function authenticationRequired() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SDO_AUTHENTICATION_REQUIRED_EVENT));
  }
  return new SdoAuthenticationRequiredError();
}

export function isSdoAuthenticationPayload(payload: unknown) {
  if (!isRecord(payload)) return false;
  const code = readNumber(payload.code) ?? readNumber(payload.status);
  const status = typeof payload.status === "string" ? payload.status : "";
  return (
    code === 401 ||
    code === 10_403 ||
    status === "unauthenticated" ||
    status === "authentication_required"
  );
}

export function isSdoAuthenticationFailure(reason: unknown) {
  const message =
    typeof reason === "string"
      ? reason
      : reason instanceof Error
        ? reason.message
        : "";
  return message === "AUTHENTICATION_REQUIRED";
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (
    typeof value === "string" &&
    value.trim() &&
    Number.isFinite(Number(value))
  ) {
    return Number(value);
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
