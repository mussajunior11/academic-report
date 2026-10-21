import { execSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";

/** Absolute path to the throwaway database used by integration tests. */
export const TEST_DB_PATH = path.join(process.cwd(), "tests", ".tmp", "integration.db");

/** A `file:` URL that works with both the Prisma CLI and the better-sqlite3 adapter. */
export function testDatabaseUrl() {
  return `file:${TEST_DB_PATH.replace(/\\/g, "/")}`;
}

/** Recreates the test database from scratch by applying all migrations. */
export function resetTestDatabase() {
  mkdirSync(path.dirname(TEST_DB_PATH), { recursive: true });
  rmSync(TEST_DB_PATH, { force: true });
  execSync("npx prisma migrate deploy", {
    stdio: "ignore",
    env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
  });
}
