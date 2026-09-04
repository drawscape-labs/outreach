#!/usr/bin/env node
const {
  normalizeProspect,
  parseArgs,
  readJson
} = require("./prospect-utils");

function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = args._[0];
  if (!inputPath) {
    console.error("Usage: node canonicalize-input.js <prospect.json>");
    process.exit(2);
  }
  const prospect = readJson(inputPath);
  const normalized = normalizeProspect(prospect);
  process.stdout.write(`${JSON.stringify(normalized, null, 2)}\n`);
}

main();
