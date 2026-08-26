/**
 * 盛趣登录命令适配器。
 * Cookie 与 ticket 均由 Tauri 后端保管，前端只接收流程状态和已验证的账号摘要。
 */
import { invoke } from "@tauri-apps/api/core";
import type { LoginPoll, LoginStart, LoginStatus } from "../models/auth";
import { isTauriRuntime } from "./runtime";

function requireDesktopRuntime() {
  if (!isTauriRuntime())
    throw new Error("请在 OpenRisingStones 桌面端使用盛趣登录");
}

export async function getSdoLoginStatus() {
  if (!isTauriRuntime())
    return { authenticated: false, profile: null } satisfies LoginStatus;
  return invoke<LoginStatus>("sdo_login_status");
}

export async function startPushLogin(account: string) {
  requireDesktopRuntime();
  return invoke<LoginStart>("sdo_start_push_login", { account });
}

export async function startQrLogin() {
  requireDesktopRuntime();
  return invoke<LoginStart>("sdo_start_qr_login");
}

export async function pollPushLogin(loginId: number) {
  requireDesktopRuntime();
  return invoke<LoginPoll>("sdo_poll_push_login", { loginId });
}

export async function pollQrLogin(loginId: number) {
  requireDesktopRuntime();
  return invoke<LoginPoll>("sdo_poll_qr_login", { loginId });
}

export async function loginWithCookie(cookie: string, userAgent: string) {
  requireDesktopRuntime();
  return invoke<LoginPoll>("sdo_login_with_cookie", { cookie, userAgent });
}

export async function cancelSdoLogin(loginId: number) {
  if (!isTauriRuntime()) return;
  await invoke("sdo_cancel_login", { loginId });
}
