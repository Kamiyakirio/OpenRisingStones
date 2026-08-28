/** Domain state shared by authentication ViewModels and Views. */
export type LoginProfile = {
  displayAccount: string;
  characterName: string;
  areaName: string;
  groupName: string;
};

export type LoginStatus = {
  authenticated: boolean;
  profile: LoginProfile | null;
};

export type LoginStart = {
  loginId: number;
  status: LoginProgress;
  expiresInSeconds: number;
  qrImageDataUrl: string | null;
};

export type LoginPoll = {
  status: LoginProgress;
  profile: LoginProfile | null;
};

export type LoginProgress =
  | "awaiting_confirmation"
  | "awaiting_scan"
  | "scanned"
  | "binding_required"
  | "success";

export type LoginMethod = "push" | "qr" | "cookie";
