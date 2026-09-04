#!/usr/bin/env node
const { mkdirSync } = require("node:fs");
const path = require("node:path");
const { parseArgs } = require("./prospect-utils");

function safeSlug(value) {
  const slug = String(value || "prospect")
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/www\./g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "prospect";
}

function timestampSlug() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z").replace(/[:]/g, "-");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const label = args.label || args.name || args.domain || args._.join(" ");
  const runName = `${timestampSlug()}-${safeSlug(label)}-${process.pid}`;
  const runDir = path.join(".agent-runs", "prospect-company", runName);
  const folders = {
    inputs: path.join(runDir, "inputs"),
    outputs: path.join(runDir, "outputs"),
    logs: path.join(runDir, "logs"),
    evidence: path.join(runDir, "evidence"),
    scratch: path.join(runDir, "scratch")
  };

  mkdirSync(runDir, { recursive: true });
  Object.values(folders).forEach((folder) => mkdirSync(folder, { recursive: true }));

  process.stdout.write(`${JSON.stringify({
    ok: true,
    run_dir: runDir,
    folders,
    paths: {
      input: path.join(folders.inputs, "input.json"),
      prospect: path.join(folders.outputs, "prospect.json"),
      research_notes: path.join(folders.evidence, "research-notes.md"),
      validation: path.join(folders.logs, "validation.json"),
      duplicates: path.join(folders.logs, "duplicates.json"),
      upsert_result: path.join(folders.outputs, "upsert-result.json")
    }
  }, null, 2)}\n`);
}

main();
