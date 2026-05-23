import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import config from "../../config/index.js";
import { pool } from "../../db/index.js";
import { USER_ROLE, type TRole } from "../../types/index.js";
import type { ILoginPayload, ISignupPayload } from "./auth.interface.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip password from a user row before returning it to the client. */
const sanitiseUser = (row: Record<string, unknown>) => {
  const { password: _pw, ...safe } = row;
  return safe;
};

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Register a new user.
 * - Validates role is contributor | maintainer
 * - Checks for duplicate email
 * - Hashes password (salt rounds = 10)
 * - Returns the new user row (no password)
 */
const signupUser = async (payload: ISignupPayload) => {
  const { name, email, password, role = USER_ROLE.contributor } = payload;

  // Validate role
  if (!Object.values(USER_ROLE).includes(role as TRole)) {
    throw Object.assign(new Error("Role must be contributor or maintainer"), {
      statusCode: 400,
    });
  }

  // Check duplicate email
  const existing = await pool.query(`SELECT id FROM users WHERE email = $1`, [
    email,
  ]);
  if ((existing.rowCount ?? 0) > 0) {
    throw Object.assign(new Error("Email already in use"), { statusCode: 400 });
  }

  // Hash password — salt rounds 10 (within spec range 8-12)
  const hashed = await bcrypt.hash(password, 10);

  const result = await pool.query(
    `INSERT INTO users (name, email, password, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, created_at, updated_at`,
    [name, email, hashed, role],
  );

  return result.rows[0];
};

/**
 * Authenticate a user and return a signed JWT.
 * Token payload includes id, name, role — as required by spec hint.
 */
const loginUser = async (payload: ILoginPayload) => {
  const { email, password } = payload;

  const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [
    email,
  ]);

  if ((result.rowCount ?? 0) === 0) {
    throw Object.assign(new Error("Invalid credentials"), { statusCode: 401 });
  }

  const user = result.rows[0] as Record<string, unknown>;
  const passwordMatch = await bcrypt.compare(
    password,
    user["password"] as string,
  );
  if (!passwordMatch) {
    throw Object.assign(new Error("Invalid credentials"), { statusCode: 401 });
  }

  // Sign JWT — payload fields needed downstream for auth & issue creation
  const jwtPayload = {
    id: user["id"],
    name: user["name"],
    role: user["role"],
  };

  const token = jwt.sign(jwtPayload, config.jwt_secret, { expiresIn: "1d" });

  return {
    token,
    user: sanitiseUser(user),
  };
};

export const authService = { signupUser, loginUser };
