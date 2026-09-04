#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const webRoot = path.join(repoRoot, "web");
const envPath = path.join(repoRoot, ".env");
const prismaCli = path.join(webRoot, "node_modules", "prisma", "build", "index.js");
const schemaPath = path.join(webRoot, "prisma", "schema.prisma");

function unquote(value) {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function readRootEnv() {
  if (!fs.existsSync(envPath)) {
    throw new Error("Missing .env. Copy .env.example to .env before running database commands.");
  }

  const values = {};

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
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

    if (key && process.env[key] === undefined) {
      values[key] = unquote(assignment.slice(separatorIndex + 1));
    }
  }

  return values;
}

function absoluteDatabaseUrl(value) {
  if (!value?.startsWith("file:")) {
    return value;
  }

  const [databasePath, ...queryParts] = value.slice("file:".length).split("?");
  const absolutePath = path.isAbsolute(databasePath)
    ? databasePath
    : path.resolve(repoRoot, databasePath);
  const query = queryParts.length ? `?${queryParts.join("?")}` : "";

  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });

  if (!fs.existsSync(absolutePath)) {
    fs.closeSync(fs.openSync(absolutePath, "a"));
  }

  return `file:${absolutePath}${query}`;
}

try {
  if (!fs.existsSync(prismaCli)) {
    throw new Error("Prisma is not installed. Run `npm --prefix web ci` first.");
  }

  const rootEnv = readRootEnv();
  const databaseUrl = absoluteDatabaseUrl(
    process.env.DATABASE_URL || rootEnv.DATABASE_URL
  );

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing from the repository-root .env file.");
  }

  const result = spawnSync(
    process.execPath,
    [prismaCli, ...process.argv.slice(2), "--schema", schemaPath],
    {
      cwd: webRoot,
      env: {
        ...process.env,
        ...rootEnv,
        DATABASE_URL: databaseUrl
      },
      stdio: "inherit"
    }
  );

  if (result.error) {
    throw result.error;
  }

  process.exit(result.status ?? 1);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
}
