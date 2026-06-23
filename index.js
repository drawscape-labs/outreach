const { spawnSync } = require("node:child_process");
const path = require("node:path");

const dbPath = path.join(__dirname, "data", "outreach.sqlite");
const sql = `
SELECT
  id,
  name,
  domain,
  description,
  linkedin_company_url
FROM companies
ORDER BY name;
`;

const result = spawnSync("sqlite3", ["-header", "-column", dbPath, sql], {
  encoding: "utf8"
});

if (result.error) {
  console.error("Could not run sqlite3. Install SQLite or run this project where sqlite3 is available.");
  process.exit(1);
}

if (result.status !== 0) {
  console.error(result.stderr.trim());
  process.exit(result.status);
}

console.log("Companies");
console.log(result.stdout.trim() || "No companies found. Run `npm run db:init` to create the database.");
