import { Pool } from "pg";
import config from "../config";

export const pool = new Pool({
  connectionString: config.database_url,
});

export const initDB = async (): Promise<void> => {
  try {
    // ── users table ──────────────────────────────────────────────────────────
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

    // ── issues table ─────────────────────────────────────────────────────────
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

    console.log("✅  Database initialised successfully");
  } catch (error) {
    console.error("❌  Database init error:", error);
 throw error;
  }
};
