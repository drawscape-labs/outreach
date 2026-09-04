#!/usr/bin/env node
const {
  parseArgs,
  readJson,
  validateProspect
} = require("./prospect-utils");

function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = args._[0];
  if (!inputPath) {
    console.error("Usage: node validate-prospect-json.js <prospect.json> [--normalized]");
    process.exit(2);
  }

  const result = validateProspect(readJson(inputPath));
  const payload = {
    ok: result.errors.length === 0,
    errors: result.errors,
    warnings: result.warnings
  };

  if (args.normalized) {
    payload.normalized = result.normalized;
  }

  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  if (!payload.ok) process.exit(1);
}

main();
