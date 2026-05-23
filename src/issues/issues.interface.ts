import type { TIssueStatus, TIssueType } from "../types";

export interface ICreateIssuePayload {
  title: string;
  description: string;
  type: TIssueType;
  reporter_id: number;
}

export interface IUpdateIssuePayload {
  title?: string;
  description?: string;
  type?: TIssueType;
}

export interface IUpdateStatusPayload {
  status: TIssueStatus;
}

export interface IIssueFilters {
  sort?: "newest" | "oldest";
  type?: TIssueType;
  status?: TIssueStatus;
}

/** Public-facing reporter shape embedded in issue responses */
export interface IReporterInfo {
  id: number;
  name: string;
  role: string;
}

export interface IIssueWithReporter {
  id: number;
  title: string;
  description: string;
  type: string;
  status: string;
  reporter: IReporterInfo;
  created_at: Date;
  updated_at: Date;
}
