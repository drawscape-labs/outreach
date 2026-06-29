#!/usr/bin/env node
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const DEFAULT_DB = "data/outreach.sqlite";
const DEFAULT_MIGRATIONS_DIR = "db/migrations";

function parseArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      args._.push(arg);
      continue;
    }

    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function quoteIdentifier(value) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid SQLite identifier: ${value}`);
  }
  return `"${value.replace(/"/g, '""')}"`;
}

function runSqlite(dbPath, sql, options = {}) {
  const args = options.json ? ["-json", dbPath, sql] : ["-bail", dbPath];
  const result = spawnSync("sqlite3", args, {
    encoding: "utf8",
    input: options.json ? undefined : sql
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `sqlite3 exited with ${result.status}`);
  }

  if (!options.json) {
    return result.stdout;
  }

  const output = result.stdout.trim();
  return output ? JSON.parse(output) : [];
}

function ensureDatabaseDirectory(dbPath) {
  const directory = path.dirname(dbPath);
  if (directory && directory !== ".") {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function ensureMigrationsTable(dbPath) {
  runSqlite(
    dbPath,
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      execution_type TEXT NOT NULL DEFAULT 'applied'
        CHECK (execution_type IN ('applied', 'baseline'))
    );`
  );
}

function getAppliedMigrations(dbPath) {
  return new Map(
    runSqlite(
      dbPath,
      `SELECT filename, checksum, applied_at, execution_type
       FROM schema_migrations
       ORDER BY filename;`,
      { json: true }
    ).map((migration) => [migration.filename, migration])
  );
}

function getMigrationFiles(migrationsDir) {
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  return fs
    .readdirSync(migrationsDir)
    .filter((filename) => filename.endsWith(".sql"))
    .sort()
    .map((filename) => {
      const filePath = path.join(migrationsDir, filename);
      const sql = fs.readFileSync(filePath, "utf8");
      return {
        filename,
        path: filePath,
        sql,
        checksum: crypto.createHash("sha256").update(sql).digest("hex")
      };
    });
}

function getVerifyColumns(sql) {
  return sql
    .split(/\r?\n/)
    .map((line) => line.match(/^--\s*migrate:verify-column\s+([A-Za-z_][A-Za-z0-9_]*)\s+([A-Za-z_][A-Za-z0-9_]*)\s*$/))
    .filter(Boolean)
    .map((match) => ({ table: match[1], column: match[2] }));
}

function columnExists(dbPath, table, column) {
  const columns = runSqlite(dbPath, `PRAGMA table_info(${quoteIdentifier(table)});`, {
    json: true
  });
  return columns.some((row) => row.name === column);
}

function verifyMigration(dbPath, migration) {
  const checks = getVerifyColumns(migration.sql);
  return checks.every((check) => columnExists(dbPath, check.table, check.column));
}

function canBaseline(dbPath, migration) {
  const checks = getVerifyColumns(migration.sql);
  return checks.length > 0 && verifyMigration(dbPath, migration);
}

function recordMigration(dbPath, migration, executionType) {
  runSqlite(
    dbPath,
    `INSERT INTO schema_migrations (filename, checksum, execution_type)
     VALUES (${sqlString(migration.filename)}, ${sqlString(migration.checksum)}, ${sqlString(executionType)});`
  );
}

function applyMigration(dbPath, migration) {
  runSqlite(dbPath, `BEGIN;\n${migration.sql.trim()}\nCOMMIT;\n`);
  if (!verifyMigration(dbPath, migration)) {
    throw new Error(`${migration.filename} ran, but its verification checks did not pass`);
  }
  recordMigration(dbPath, migration, "applied");
}

function getStatus(dbPath, migrations, applied) {
  return migrations.map((migration) => {
    const appliedMigration = applied.get(migration.filename);
    if (!appliedMigration) {
      return {
        filename: migration.filename,
        status: canBaseline(dbPath, migration) ? "baseline-ready" : "pending"
      };
    }

    if (appliedMigration.checksum !== migration.checksum) {
      return {
        filename: migration.filename,
        status: "changed",
        appliedAt: appliedMigration.applied_at,
        executionType: appliedMigration.execution_type
      };
    }

    return {
      filename: migration.filename,
      status: appliedMigration.execution_type || "applied",
      appliedAt: appliedMigration.applied_at
    };
  });
}

function printStatus(rows) {
  if (rows.length === 0) {
    console.log("No migration files found.");
    return;
  }

  rows.forEach((row) => {
    const suffix = row.appliedAt ? ` (${row.appliedAt})` : "";
    console.log(`${row.status.padEnd(14)} ${row.filename}${suffix}`);
  });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const dbPath = args.db || DEFAULT_DB;
  const migrationsDir = args.dir || DEFAULT_MIGRATIONS_DIR;
  const statusOnly = Boolean(args.status);
  const dryRun = Boolean(args["dry-run"]);

  ensureDatabaseDirectory(dbPath);
  ensureMigrationsTable(dbPath);

  const migrations = getMigrationFiles(migrationsDir);
  const applied = getAppliedMigrations(dbPath);
  const status = getStatus(dbPath, migrations, applied);
  const changed = status.filter((row) => row.status === "changed");

  if (changed.length > 0) {
    printStatus(status);
    throw new Error(
      `Applied migration checksum changed: ${changed.map((row) => row.filename).join(", ")}`
    );
  }

  if (statusOnly) {
    printStatus(status);
    return;
  }

  const pending = migrations.filter((migration) => !applied.has(migration.filename));
  if (pending.length === 0) {
    console.log("No pending migrations.");
    return;
  }

  if (dryRun) {
    printStatus(status.filter((row) => row.status === "pending" || row.status === "baseline-ready"));
    return;
  }

  pending.forEach((migration) => {
    if (canBaseline(dbPath, migration)) {
      recordMigration(dbPath, migration, "baseline");
      console.log(`Baselined ${migration.filename}`);
      return;
    }

    applyMigration(dbPath, migration);
    console.log(`Applied ${migration.filename}`);
  });
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
