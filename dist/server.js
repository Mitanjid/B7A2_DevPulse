

   import { createRequire } from 'module';

   const require = createRequire(import.meta.url);

  

// src/config/index.ts
import dotenv from "dotenv";
import { env } from "process";
dotenv.config({ quiet: true });
var config = {
  port: env.PORT,
  database_url: env.DATABASE_URL,
  jwt_secret: process.env.JWT_SECRET
};
var config_default = config;

// src/app.ts
import cors from "cors";
import express from "express";

// src/modules/auth/auth.route.ts
import { Router } from "express";

// src/modules/auth/auth.service.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// src/db/index.ts
import { Pool } from "pg";
var pool = new Pool({
  connectionString: config_default.database_url
});
var initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(100)        NOT NULL,
        email       VARCHAR(255) UNIQUE NOT NULL,
        password    TEXT                NOT NULL,
        role        VARCHAR(20)         NOT NULL DEFAULT 'contributor'
                      CHECK (role IN ('contributor', 'maintainer')),
        created_at  TIMESTAMP           NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMP           NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS issues (
        id           SERIAL PRIMARY KEY,
        title        VARCHAR(150)  NOT NULL,
        description TEXT NOT NULL CHECK (char_length(description) >= 20),
        type         VARCHAR(20)   NOT NULL CHECK (type IN ('bug', 'feature_request')),
        status       VARCHAR(20)   NOT NULL DEFAULT 'open'
                       CHECK (status IN ('open', 'in_progress', 'resolved')),
        reporter_id  INT           NOT NULL,
        created_at   TIMESTAMP     NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMP     NOT NULL DEFAULT NOW()
      )
    `);
    console.log("\u2705  Database initialised successfully");
  } catch (error) {
    console.error("\u274C  Database init error:", error);
    throw error;
  }
};

// src/types/index.ts
var USER_ROLE = {
  contributor: "contributor",
  maintainer: "maintainer"
};
var ISSUE_TYPE = {
  bug: "bug",
  feature_request: "feature_request"
};
var ISSUE_STATUS = {
  open: "open",
  in_progress: "in_progress",
  resolved: "resolved"
};

// src/modules/auth/auth.service.ts
var sanitiseUser = (row) => {
  const { password: _pw, ...safe } = row;
  return safe;
};
var signupUser = async (payload) => {
  const { name, email, password, role = USER_ROLE.contributor } = payload;
  if (!Object.values(USER_ROLE).includes(role)) {
    throw Object.assign(new Error("Role must be contributor or maintainer"), {
      statusCode: 400
    });
  }
  const existing = await pool.query(`SELECT id FROM users WHERE email = $1`, [
    email
  ]);
  if ((existing.rowCount ?? 0) > 0) {
    throw Object.assign(new Error("Email already in use"), { statusCode: 400 });
  }
  const hashed = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO users (name, email, password, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, created_at, updated_at`,
    [name, email, hashed, role]
  );
  return result.rows[0];
};
var loginUser = async (payload) => {
  const { email, password } = payload;
  const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [
    email
  ]);
  if ((result.rowCount ?? 0) === 0) {
    throw Object.assign(new Error("Invalid credentials"), { statusCode: 401 });
  }
  const user = result.rows[0];
  const passwordMatch = await bcrypt.compare(
    password,
    user["password"]
  );
  if (!passwordMatch) {
    throw Object.assign(new Error("Invalid credentials"), { statusCode: 401 });
  }
  const jwtPayload = {
    id: user["id"],
    name: user["name"],
    role: user["role"]
  };
  const token = jwt.sign(jwtPayload, config_default.jwt_secret, { expiresIn: "1d" });
  return {
    token,
    user: sanitiseUser(user)
  };
};
var authService = { signupUser, loginUser };

// src/utility/sendResponse.ts
var sendResponse = (res, payload) => {
  const body = {
    success: payload.success,
    message: payload.message
  };
  if (payload.data !== void 0) body["data"] = payload.data;
  if (payload.errors !== void 0) body["errors"] = payload.errors;
  res.status(payload.statusCode).json(body);
};
var sendResponse_default = sendResponse;

// src/modules/auth/auth.controller.ts
var signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      sendResponse_default(res, {
        statusCode: 400,
        success: false,
        message: "name, email, and password are required"
      });
      return;
    }
    const user = await authService.signupUser({
      name,
      email,
      password,
      role
    });
    sendResponse_default(res, {
      statusCode: 201,
      success: true,
      message: "User registered successfully",
      data: user
    });
  } catch (err) {
    const e = err;
    sendResponse_default(res, {
      statusCode: e.statusCode ?? 500,
      success: false,
      message: e.message
    });
  }
};
var login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      sendResponse_default(res, {
        statusCode: 400,
        success: false,
        message: "email and password are required"
      });
      return;
    }
    const result = await authService.loginUser({ email, password });
    sendResponse_default(res, {
      statusCode: 200,
      success: true,
      message: "Login successful",
      data: result
    });
  } catch (err) {
    const e = err;
    sendResponse_default(res, {
      statusCode: e.statusCode ?? 500,
      success: false,
      message: e.message
    });
  }
};
var authController = { signup, login };

// src/modules/auth/auth.route.ts
var router = Router();
router.post("/signup", authController.signup);
router.post("/login", authController.login);
var authRoute = router;

// src/modules/issues/issues.route.ts
import { Router as Router2 } from "express";

// src/middleware/auth.ts
import jwt2 from "jsonwebtoken";
var auth = (...roles) => {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization;
      if (!token) {
        res.status(401).json({
          success: false,
          message: "Unauthorized: No token provided"
        });
        return;
      }
      let decoded;
      try {
        decoded = jwt2.verify(token, config_default.jwt_secret);
      } catch {
        res.status(401).json({
          success: false,
          message: "Unauthorized: Invalid or expired token"
        });
        return;
      }
      if (roles.length > 0 && !roles.includes(decoded.role)) {
        res.status(403).json({
          success: false,
          message: "Forbidden: You do not have permission to perform this action"
        });
        return;
      }
      req.user = decoded;
      next();
    } catch (error) {
      next(error);
    }
  };
};
var auth_default = auth;

// src/modules/issues/issues.service.ts
var fetchReporters = async (ids) => {
  if (ids.length === 0) return /* @__PURE__ */ new Map();
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
  const result = await pool.query(
    `SELECT id, name, role FROM users WHERE id IN (${placeholders})`,
    ids
  );
  const map = /* @__PURE__ */ new Map();
  for (const row of result.rows) {
    map.set(row.id, { id: row.id, name: row.name, role: row.role });
  }
  return map;
};
var attachReporters = async (issues) => {
  const ids = [...new Set(issues.map((i) => i["reporter_id"]))];
  const reporters = await fetchReporters(ids);
  return issues.map((issue) => {
    const { reporter_id, ...rest } = issue;
    const reporter = reporters.get(reporter_id) ?? {
      id: reporter_id,
      name: "Unknown",
      role: "unknown"
    };
    return { ...rest, reporter };
  });
};
var createIssue = async (payload) => {
  const { title, description, type, reporter_id } = payload;
  if (!title || !description || !type) {
    throw Object.assign(
      new Error("title, description, and type are required"),
      {
        statusCode: 400
      }
    );
  }
  if (title.length > 150) {
    throw Object.assign(new Error("title must be 150 characters or fewer"), {
      statusCode: 400
    });
  }
  if (description.length < 20) {
    throw Object.assign(
      new Error("description must be at least 20 characters"),
      { statusCode: 400 }
    );
  }
  if (!Object.values(ISSUE_TYPE).includes(type)) {
    throw Object.assign(new Error("type must be bug or feature_request"), {
      statusCode: 400
    });
  }
  const result = await pool.query(
    `INSERT INTO issues (title, description, type, reporter_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [title, description, type, reporter_id]
  );
  return result.rows[0];
};
var getAllIssues = async (filters) => {
  const { sort = "newest", type, status } = filters;
  const conditions = [];
  const values = [];
  let idx = 1;
  if (type) {
    conditions.push(`type = $${idx++}`);
    values.push(type);
  }
  if (status) {
    conditions.push(`status = $${idx++}`);
    values.push(status);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const order = sort === "oldest" ? "ASC" : "DESC";
  const result = await pool.query(
    `SELECT * FROM issues ${where} ORDER BY created_at ${order}`,
    values
  );
  return attachReporters(result.rows);
};
var getIssueById = async (id) => {
  const result = await pool.query(`SELECT * FROM issues WHERE id = $1`, [id]);
  if ((result.rowCount ?? 0) === 0) {
    throw Object.assign(new Error("Issue not found"), { statusCode: 404 });
  }
  const [issue] = await attachReporters(
    result.rows
  );
  return issue;
};
var updateIssue = async (id, payload, requesterId, requesterRole) => {
  const existing = await pool.query(`SELECT * FROM issues WHERE id = $1`, [id]);
  if ((existing.rowCount ?? 0) === 0) {
    throw Object.assign(new Error("Issue not found"), { statusCode: 404 });
  }
  const issue = existing.rows[0];
  if (requesterRole !== "maintainer") {
    if (issue["reporter_id"] !== requesterId) {
      throw Object.assign(
        new Error("Forbidden: You can only edit your own issues"),
        { statusCode: 403 }
      );
    }
    if (issue["status"] !== ISSUE_STATUS.open) {
      throw Object.assign(
        new Error(
          "Conflict: Contributors can only edit issues with status 'open'"
        ),
        { statusCode: 409 }
      );
    }
  }
  const { title, description, type } = payload;
  if (title !== void 0 && title.length > 150) {
    throw Object.assign(new Error("title must be 150 characters or fewer"), {
      statusCode: 400
    });
  }
  if (description !== void 0 && description.length < 20) {
    throw Object.assign(
      new Error("description must be at least 20 characters"),
      { statusCode: 400 }
    );
  }
  if (type !== void 0 && !Object.values(ISSUE_TYPE).includes(type)) {
    throw Object.assign(new Error("type must be bug or feature_request"), {
      statusCode: 400
    });
  }
  const updates = [];
  const values = [];
  let idx = 1;
  if (title !== void 0) {
    updates.push(`title = $${idx++}`);
    values.push(title);
  }
  if (description !== void 0) {
    updates.push(`description = $${idx++}`);
    values.push(description);
  }
  if (type !== void 0) {
    updates.push(`type = $${idx++}`);
    values.push(type);
  }
  if (updates.length === 0) {
    throw Object.assign(new Error("No fields provided for update"), {
      statusCode: 400
    });
  }
  updates.push(`updated_at = NOW()`);
  values.push(id);
  const result = await pool.query(
    `UPDATE issues SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0];
};
var deleteIssue = async (id) => {
  const result = await pool.query(`DELETE FROM issues WHERE id = $1`, [id]);
  if ((result.rowCount ?? 0) === 0) {
    throw Object.assign(new Error("Issue not found"), { statusCode: 404 });
  }
};
var issuesService = {
  createIssue,
  getAllIssues,
  getIssueById,
  updateIssue,
  deleteIssue
};

// src/modules/issues/issues.controller.ts
var createIssue2 = async (req, res) => {
  try {
    const { title, description, type } = req.body;
    const reporter_id = req.user.id;
    const issue = await issuesService.createIssue({
      title: title ?? "",
      description: description ?? "",
      type,
      reporter_id
    });
    sendResponse_default(res, {
      statusCode: 201,
      success: true,
      message: "Issue created successfully",
      data: issue
    });
  } catch (err) {
    const e = err;
    sendResponse_default(res, {
      statusCode: e.statusCode ?? 500,
      success: false,
      message: e.message
    });
  }
};
var getAllIssues2 = async (req, res) => {
  try {
    const { sort, type, status } = req.query;
    const issues = await issuesService.getAllIssues({
      sort: sort === "oldest" ? "oldest" : "newest",
      type,
      status
    });
    sendResponse_default(res, {
      statusCode: 200,
      success: true,
      message: "Issues retrieved successfully",
      data: issues
    });
  } catch (err) {
    const e = err;
    sendResponse_default(res, {
      statusCode: e.statusCode ?? 500,
      success: false,
      message: e.message
    });
  }
};
var getIssueById2 = async (req, res) => {
  try {
    const id = parseInt(String(req.params.id ?? "0"), 10);
    if (isNaN(id)) {
      sendResponse_default(res, {
        statusCode: 400,
        success: false,
        message: "Invalid issue id"
      });
      return;
    }
    const issue = await issuesService.getIssueById(id);
    sendResponse_default(res, {
      statusCode: 200,
      success: true,
      message: "Issue retrieved successfully",
      data: issue
    });
  } catch (err) {
    const e = err;
    sendResponse_default(res, {
      statusCode: e.statusCode ?? 500,
      success: false,
      message: e.message
    });
  }
};
var updateIssue2 = async (req, res) => {
  try {
    const id = parseInt(String(req.params.id ?? "0"), 10);
    if (isNaN(id)) {
      sendResponse_default(res, {
        statusCode: 400,
        success: false,
        message: "Invalid issue id"
      });
      return;
    }
    const { title, description, type } = req.body;
    const issue = await issuesService.updateIssue(
      id,
      {
        ...title !== void 0 && { title },
        ...description !== void 0 && { description },
        ...type !== void 0 && { type }
      },
      req.user.id,
      req.user.role
    );
    sendResponse_default(res, {
      statusCode: 200,
      success: true,
      message: "Issue updated successfully",
      data: issue
    });
  } catch (err) {
    const e = err;
    sendResponse_default(res, {
      statusCode: e.statusCode ?? 500,
      success: false,
      message: e.message
    });
  }
};
var deleteIssue2 = async (req, res) => {
  try {
    const id = parseInt(String(req.params.id ?? "0"), 10);
    if (isNaN(id)) {
      sendResponse_default(res, {
        statusCode: 400,
        success: false,
        message: "Invalid issue id"
      });
      return;
    }
    await issuesService.deleteIssue(id);
    sendResponse_default(res, {
      statusCode: 200,
      success: true,
      message: "Issue deleted successfully"
    });
  } catch (err) {
    const e = err;
    sendResponse_default(res, {
      statusCode: e.statusCode ?? 500,
      success: false,
      message: e.message
    });
  }
};
var issuesController = {
  createIssue: createIssue2,
  getAllIssues: getAllIssues2,
  getIssueById: getIssueById2,
  updateIssue: updateIssue2,
  deleteIssue: deleteIssue2
};

// src/modules/issues/issues.route.ts
var router2 = Router2();
router2.get("/", issuesController.getAllIssues);
router2.get("/:id", issuesController.getIssueById);
router2.post(
  "/",
  auth_default(USER_ROLE.contributor, USER_ROLE.maintainer),
  issuesController.createIssue
);
router2.patch(
  "/:id",
  auth_default(USER_ROLE.contributor, USER_ROLE.maintainer),
  issuesController.updateIssue
);
router2.delete("/:id", auth_default(USER_ROLE.maintainer), issuesController.deleteIssue);
var issuesRoute = router2;

// src/middleware/logger.ts
import fs from "fs";
var logger = (req, _res, next) => {
  const log = `[${(/* @__PURE__ */ new Date()).toISOString()}] ${req.method} ${req.url}
`;
  console.log(log.trim());
  fs.appendFile("logger.txt", log, () => {
  });
  next();
};
var logger_default = logger;

// src/app.ts
var app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger_default);
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "DevPulse API is running \u{1F680}",
    version: "1.0.0"
  });
});
app.use("/api/auth", authRoute);
app.use("/api/issues", issuesRoute);
var app_default = app;

// src/server.ts
var main = async () => {
  initDB();
  app_default.listen(config_default.port, () => {
    console.log(`server is running on ${config_default.port}`);
  });
};
main();
//# sourceMappingURL=server.js.map