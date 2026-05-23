import { pool } from "../../config/db/index.js";
import { ISSUE_STATUS, ISSUE_TYPE } from "../../types/index.js";
import type {
  ICreateIssuePayload,
  IIssueFilters,
  IIssueWithReporter,
  IUpdateIssuePayload,
} from "./issues.interface.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fetch reporter details for a list of reporter IDs in one query.
 * Avoids JOINs by doing a separate WHERE id IN (...) lookup.
 */
const fetchReporters = async (
  ids: number[],
): Promise<Map<number, { id: number; name: string; role: string }>> => {
  if (ids.length === 0) return new Map();

  // Build $1,$2,... placeholders
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
  const result = await pool.query(
    `SELECT id, name, role FROM users WHERE id IN (${placeholders})`,
    ids,
  );

  const map = new Map<number, { id: number; name: string; role: string }>();
  for (const row of result.rows as {
    id: number;
    name: string;
    role: string;
  }[]) {
    map.set(row.id, { id: row.id, name: row.name, role: row.role });
  }
  return map;
};

/** Attach reporter info to issue rows. */
const attachReporters = async (
  issues: Record<string, unknown>[],
): Promise<IIssueWithReporter[]> => {
  const ids = [...new Set(issues.map((i) => i["reporter_id"] as number))];
  const reporters = await fetchReporters(ids);

  return issues.map((issue) => {
    const { reporter_id, ...rest } = issue;
    const reporter = reporters.get(reporter_id as number) ?? {
      id: reporter_id as number,
      name: "Unknown",
      role: "unknown",
    };
    return { ...rest, reporter } as unknown as IIssueWithReporter;
  });
};

// ─── Service Functions ────────────────────────────────────────────────────────

/** Create a new issue. reporter_id comes from the JWT, not the request body. */
const createIssue = async (payload: ICreateIssuePayload) => {
  const { title, description, type, reporter_id } = payload;

  // Validate
  if (!title || !description || !type) {
    throw Object.assign(
      new Error("title, description, and type are required"),
      {
        statusCode: 400,
      },
    );
  }
  if (title.length > 150) {
    throw Object.assign(new Error("title must be 150 characters or fewer"), {
      statusCode: 400,
    });
  }
  if (description.length < 20) {
    throw Object.assign(
      new Error("description must be at least 20 characters"),
      { statusCode: 400 },
    );
  }
  if (!Object.values(ISSUE_TYPE).includes(type)) {
    throw Object.assign(new Error("type must be bug or feature_request"), {
      statusCode: 400,
    });
  }

  const result = await pool.query(
    `INSERT INTO issues (title, description, type, reporter_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [title, description, type, reporter_id],
  );

  return result.rows[0];
};

/** Get all issues with optional sort/filter. */
const getAllIssues = async (
  filters: IIssueFilters,
): Promise<IIssueWithReporter[]> => {
  const { sort = "newest", type, status } = filters;

  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (type) {
    conditions.push(`type = $${idx++}`);
    values.push(type);
  }
  if (status) {
    conditions.push(`status = $${idx++}`);
    values.push(status);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const order = sort === "oldest" ? "ASC" : "DESC";

  const result = await pool.query(
    `SELECT * FROM issues ${where} ORDER BY created_at ${order}`,
    values,
  );

  return attachReporters(result.rows as Record<string, unknown>[]);
};

/** Get a single issue by id. */
const getIssueById = async (id: number): Promise<IIssueWithReporter> => {
  const result = await pool.query(`SELECT * FROM issues WHERE id = $1`, [id]);

  if ((result.rowCount ?? 0) === 0) {
    throw Object.assign(new Error("Issue not found"), { statusCode: 404 });
  }

  const [issue] = await attachReporters(
    result.rows as Record<string, unknown>[],
  );
  return issue as IIssueWithReporter;
};

/**
 * Update an issue's editable fields (title, description, type).
 * Business rules enforced here:
 *  - Maintainer: can update any issue
 *  - Contributor: only their own issue AND only when status is open
 */
const updateIssue = async (
  id: number,
  payload: IUpdateIssuePayload,
  requesterId: number,
  requesterRole: string,
): Promise<Record<string, unknown>> => {
  // Fetch the issue first
  const existing = await pool.query(`SELECT * FROM issues WHERE id = $1`, [id]);
  if ((existing.rowCount ?? 0) === 0) {
    throw Object.assign(new Error("Issue not found"), { statusCode: 404 });
  }

  const issue = existing.rows[0] as Record<string, unknown>;

  // Contributor restrictions
  if (requesterRole !== "maintainer") {
    if (issue["reporter_id"] !== requesterId) {
      throw Object.assign(
        new Error("Forbidden: You can only edit your own issues"),
        { statusCode: 403 },
      );
    }
    if (issue["status"] !== ISSUE_STATUS.open) {
      throw Object.assign(
        new Error(
          "Conflict: Contributors can only edit issues with status 'open'",
        ),
        { statusCode: 409 },
      );
    }
  }

  // Validate update payload fields
  const { title, description, type } = payload;

  if (title !== undefined && title.length > 150) {
    throw Object.assign(new Error("title must be 150 characters or fewer"), {
      statusCode: 400,
    });
  }
  if (description !== undefined && description.length < 20) {
    throw Object.assign(
      new Error("description must be at least 20 characters"),
      { statusCode: 400 },
    );
  }
  if (type !== undefined && !Object.values(ISSUE_TYPE).includes(type)) {
    throw Object.assign(new Error("type must be bug or feature_request"), {
      statusCode: 400,
    });
  }

  // Build dynamic SET clause — only update provided fields
  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (title !== undefined) {
    updates.push(`title = $${idx++}`);
    values.push(title);
  }
  if (description !== undefined) {
    updates.push(`description = $${idx++}`);
    values.push(description);
  }
  if (type !== undefined) {
    updates.push(`type = $${idx++}`);
    values.push(type);
  }

  if (updates.length === 0) {
    throw Object.assign(new Error("No fields provided for update"), {
      statusCode: 400,
    });
  }

  updates.push(`updated_at = NOW()`);
  values.push(id);

  const result = await pool.query(
    `UPDATE issues SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`,
    values,
  );

  return result.rows[0] as Record<string, unknown>;
};

/** Delete an issue permanently. Maintainer only (enforced in route). */
const deleteIssue = async (id: number): Promise<void> => {
  const result = await pool.query(`DELETE FROM issues WHERE id = $1`, [id]);
  if ((result.rowCount ?? 0) === 0) {
    throw Object.assign(new Error("Issue not found"), { statusCode: 404 });
  }
};

export const issuesService = {
  createIssue,
  getAllIssues,
  getIssueById,
  updateIssue,
  deleteIssue,
};
