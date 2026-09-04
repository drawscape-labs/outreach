import fs from "node:fs";
import path from "node:path";
import { PageHeader, PageShell } from "@/components";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const skillsDirectory = path.resolve(process.cwd(), "../.codex/skills");
const coreSkillOrder = new Map(
  ["setup", "prospect-company", "discover-companies"].map((name, index) => [
    name,
    index
  ])
);

function unquote(value) {
  const trimmed = value.trim();

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed.slice(1, -1);
    }
  }

  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function frontmatterValue(markdown, key) {
  const frontmatter = markdown.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);

  if (!frontmatter) {
    return "";
  }

  const line = frontmatter[1]
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${key}:`));

  return line ? unquote(line.slice(key.length + 1)) : "";
}

function defaultPrompt(skillDirectory, name) {
  const agentPath = path.join(skillDirectory, "agents", "openai.yaml");

  if (!fs.existsSync(agentPath)) {
    return `Use $${name} to help with this task.`;
  }

  const agentConfig = fs.readFileSync(agentPath, "utf8");
  const promptLine = agentConfig
    .split(/\r?\n/)
    .find((line) => line.trimStart().startsWith("default_prompt:"));

  return promptLine
    ? unquote(promptLine.trimStart().slice("default_prompt:".length))
    : `Use $${name} to help with this task.`;
}

function listSkills() {
  if (!fs.existsSync(skillsDirectory)) {
    return [];
  }

  return fs
    .readdirSync(skillsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const skillDirectory = path.join(skillsDirectory, entry.name);
      const skillPath = path.join(skillDirectory, "SKILL.md");

      if (!fs.existsSync(skillPath)) {
        return null;
      }

      const markdown = fs.readFileSync(skillPath, "utf8");
      const name = frontmatterValue(markdown, "name") || entry.name;

      return {
        description:
          frontmatterValue(markdown, "description") ||
          "No description is available for this skill.",
        name,
        prompt: defaultPrompt(skillDirectory, name)
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const aOrder = coreSkillOrder.get(a.name);
      const bOrder = coreSkillOrder.get(b.name);

      if (aOrder !== undefined || bOrder !== undefined) {
        return (aOrder ?? Number.MAX_SAFE_INTEGER) -
          (bOrder ?? Number.MAX_SAFE_INTEGER);
      }

      return a.name.localeCompare(b.name);
    });
}

export default function SkillsPage() {
  const skills = listSkills();

  return (
    <PageShell>
      <PageHeader
        eyebrow="Automation"
        title="Skills"
        description="Repository-specific workflows Codex can use to set up, research, enrich, and maintain this outreach workspace."
      />

      <section className="mt-6" aria-labelledby="available-skills">
        <div className="flex items-baseline justify-between gap-4">
          <h2
            id="available-skills"
            className="text-base font-semibold text-gray-900 dark:text-white"
          >
            Available skills
          </h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            {skills.length} {skills.length === 1 ? "skill" : "skills"}
          </p>
        </div>

        {skills.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-gray-300 px-6 py-10 text-center text-sm text-gray-500 dark:border-white/15 dark:text-zinc-400">
            No repository skills were found.
          </div>
        ) : (
          <ul
            role="list"
            className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            {skills.map((skill) => {
              const isCore = coreSkillOrder.has(skill.name);

              return (
                <li
                  key={skill.name}
                  className={`rounded-lg border p-5 shadow-sm dark:shadow-none ${
                    isCore
                      ? "border-teal-200 bg-teal-50/60 ring-1 ring-teal-100 dark:border-teal-400/30 dark:bg-teal-400/5 dark:ring-teal-400/10"
                      : "border-gray-200 bg-white dark:border-white/10 dark:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-teal-50 font-mono text-sm font-semibold text-teal-700 dark:bg-teal-400/10 dark:text-teal-300">
                      $
                    </span>
                    <h3 className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {skill.name}
                    </h3>
                    {isCore ? (
                      <span className="ml-auto rounded-full bg-teal-700 px-2.5 py-1 text-xs font-semibold text-white dark:bg-teal-400 dark:text-zinc-950">
                        Important skill
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-4 text-sm/6 text-gray-600 dark:text-zinc-300">
                    {skill.description}
                  </p>
                  <div
                    className={`mt-5 border-t pt-4 ${
                      isCore
                        ? "border-teal-200/80 dark:border-teal-400/20"
                        : "border-gray-100 dark:border-white/10"
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400">
                      How to use
                    </p>
                    <code className="mt-2 block rounded-md bg-white/70 px-3 py-2 text-sm/6 text-gray-700 dark:bg-white/5 dark:text-zinc-200">
                      {skill.prompt}
                    </code>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </PageShell>
  );
}
