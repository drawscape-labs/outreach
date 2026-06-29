import { spawnSync } from "node:child_process";
import path from "node:path";

const dbPath = path.join(process.cwd(), "..", "data", "outreach.sqlite");

export function query(sql) {
  const result = spawnSync("sqlite3", ["-json", dbPath, `PRAGMA foreign_keys = ON;\n${sql}`], {
    encoding: "utf8"
  });

  if (result.error) {
    throw new Error(`Could not run sqlite3: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || "SQLite query failed");
  }

  return JSON.parse(result.stdout || "[]");
}

export function sqlInteger(value) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
}

export function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

export function sqlValue(value) {
  if (value === null || value === undefined) {
    return "NULL";
  }

  if (typeof value === "boolean") {
    return value ? "1" : "0";
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Cannot serialize non-finite number for SQL.");
    }

    return String(value);
  }

  return sqlString(value);
}
