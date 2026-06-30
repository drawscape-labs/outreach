// Server-side Prisma client setup and local DATABASE_URL bootstrap.
// Keep connection lifecycle code here; model-specific queries belong in app/api/*/model.js.
import fs from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

let localEnvLoaded = false;

function parseEnvValue(value) {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function resolveDatabaseUrl(value, envPath) {
  if (!value.startsWith("file:")) {
    return value;
  }

  const databasePath = value.slice("file:".length);

  if (path.isAbsolute(databasePath)) {
    return value;
  }

  return `file:${path.resolve(path.dirname(envPath), databasePath)}`;
}

function loadLocalEnv() {
  if (localEnvLoaded || process.env.DATABASE_URL) {
    localEnvLoaded = true;
    return;
  }

  localEnvLoaded = true;

  for (const envPath of [
    path.join(process.cwd(), ".env"),
    path.join(process.cwd(), "..", ".env")
  ]) {
    if (!fs.existsSync(envPath)) {
      continue;
    }

    const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const assignment = trimmed.startsWith("export ")
        ? trimmed.slice("export ".length)
        : trimmed;
      const separatorIndex = assignment.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const key = assignment.slice(0, separatorIndex).trim();

      if (key === "DATABASE_URL") {
        process.env.DATABASE_URL = resolveDatabaseUrl(
          parseEnvValue(assignment.slice(separatorIndex + 1)),
          envPath
        );
        return;
      }
    }
  }
}

loadLocalEnv();

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
