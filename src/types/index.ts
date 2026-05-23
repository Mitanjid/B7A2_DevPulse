// ─── Role Constants ────────────────────────────────────────────────────────────
export const USER_ROLE = {
  contributor: "contributor",
  maintainer: "maintainer",
} as const;

export type TRole = keyof typeof USER_ROLE;

// ─── Issue Enums ───────────────────────────────────────────────────────────────
export const ISSUE_TYPE = {
  bug: "bug",
  feature_request: "feature_request",
} as const;

export type TIssueType = keyof typeof ISSUE_TYPE;

export const ISSUE_STATUS = {
  open: "open",
  in_progress: "in_progress",
  resolved: "resolved",
} as const;

export type TIssueStatus = keyof typeof ISSUE_STATUS;

// ─── JWT Payload ───────────────────────────────────────────────────────────────
export interface IJwtPayload {
  id: number;
  name: string;
  role: TRole;
}

// ─── Express Request Augmentation ─────────────────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      user?: IJwtPayload;
    }
  }
}
