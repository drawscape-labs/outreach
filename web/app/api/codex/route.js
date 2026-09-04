import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { closeSync, existsSync, mkdirSync, openSync } from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REPO_ROOT = path.resolve(process.cwd(), "..");
const LOG_ROOT = path.join(REPO_ROOT, ".agent-runs");
const DEFAULT_CODEX_BIN = process.env.CODEX_BIN || "codex";
const NO_SANDBOX_MODE = "none";
const MAX_INPUT_LENGTH = 8000;

const CODEX_SKILLS = new Map([
  [
    "enrich-company",
    {
      sandbox: NO_SANDBOX_MODE,
      model: "gpt-5.5",
      modelReasoningEffort: "low",
      modelVerbosity: "low",
      serviceTier: "",
      toolOutputTokenLimit: 8000
    }
  ],
  [
    "prospect-company",
    {
      sandbox: NO_SANDBOX_MODE,
      model: "gpt-5.5",
      modelReasoningEffort: "low",
      modelVerbosity: "low",
      serviceTier: "",
      toolOutputTokenLimit: 8000
    }
  ]
]);

function json(data, init) {
  return Response.json(data, init);
}

function readString(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function safeRedirectPath(value) {
  const redirectPath = readString(value);

  if (!redirectPath || !redirectPath.startsWith("/") || redirectPath.startsWith("//")) {
    return "";
  }

  return redirectPath;
}

function redirectWithStatus(request, redirectTo, params) {
  const url = new URL(redirectTo, request.url);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return Response.redirect(url, 303);
}

function errorResponse(request, redirectTo, message, status = 400) {
  if (redirectTo) {
    return redirectWithStatus(request, redirectTo, {
      codexStatus: "error",
      codexMessage: message
    });
  }

  return json({ ok: false, error: message }, { status });
}

function buildPrompt(skill, input) {
  return [`$${skill}`, input].filter(Boolean).join("\n\n");
}

function safeName(value) {
  return value.replace(/[^a-z0-9-]/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function skillLogDir(skill) {
  return path.join(LOG_ROOT, safeName(skill), "logs");
}

function tomlLiteral(value) {
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(String(value));
}

function appendLaunchSettings(args, config) {
  if (config.model) {
    args.push("--model", config.model);
  }

  if (config.modelReasoningEffort) {
    args.push("-c", `model_reasoning_effort=${tomlLiteral(config.modelReasoningEffort)}`);
  }

  if (config.modelVerbosity) {
    args.push("-c", `model_verbosity=${tomlLiteral(config.modelVerbosity)}`);
  }

  if (config.serviceTier) {
    args.push("-c", `service_tier=${tomlLiteral(config.serviceTier)}`);
  }

  if (config.toolOutputTokenLimit !== null && config.toolOutputTokenLimit !== undefined) {
    args.push("-c", `tool_output_token_limit=${tomlLiteral(config.toolOutputTokenLimit)}`);
  }
}

function launchSettings(config) {
  return {
    model: config.model,
    modelReasoningEffort: config.modelReasoningEffort,
    modelVerbosity: config.modelVerbosity,
    serviceTier: config.serviceTier || null,
    toolOutputTokenLimit: config.toolOutputTokenLimit
  };
}

function checkCodex() {
  const result = spawnSync(DEFAULT_CODEX_BIN, ["--version"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: process.env,
    timeout: 5000
  });

  if (result.error) {
    return { ok: false, error: result.error.message };
  }

  if (result.status !== 0) {
    return {
      ok: false,
      error: result.stderr.trim() || result.stdout.trim() || "Codex version check failed."
    };
  }

  return { ok: true, version: result.stdout.trim() };
}

export async function GET() {
  const codex = checkCodex();
  const logDirs = Object.fromEntries(
    Array.from(CODEX_SKILLS.keys()).map((skill) => [skill, skillLogDir(skill)])
  );

  return json({
    ok: codex.ok,
    codexBin: DEFAULT_CODEX_BIN,
    codexVersion: codex.version,
    codexError: codex.error,
    cwd: REPO_ROOT,
    logRoot: LOG_ROOT,
    logDirs,
    logDirExists: Object.fromEntries(
      Object.entries(logDirs).map(([skill, logDir]) => [skill, existsSync(logDir)])
    ),
    skills: Array.from(CODEX_SKILLS.keys()),
    sandboxes: Object.fromEntries(
      Array.from(CODEX_SKILLS, ([skill, config]) => [skill, config.sandbox])
    ),
    launchSettings: Object.fromEntries(
      Array.from(CODEX_SKILLS, ([skill, config]) => [skill, launchSettings(config)])
    )
  });
}

export async function POST(request) {
  let body;
  let redirectTo = "";

  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());
      redirectTo = safeRedirectPath(body.redirectTo);
    }
  } catch {
    return errorResponse(request, redirectTo, "Expected a JSON or form body.", 400);
  }

  const skill = readString(body.skill);
  const input = readString(body.input || body.instructions);
  const skillConfig = CODEX_SKILLS.get(skill);

  if (!skillConfig) {
    return errorResponse(
      request,
      redirectTo,
      `Unsupported Codex skill: ${skill || "(empty)"}. Use enrich-company or prospect-company.`,
      400
    );
  }

  if (input.length > MAX_INPUT_LENGTH) {
    return errorResponse(request, redirectTo, `Input is too long. Maximum is ${MAX_INPUT_LENGTH} characters.`, 400);
  }

  if (!input) {
    return errorResponse(request, redirectTo, "Input is required when launching a skill.", 400);
  }

  const codex = checkCodex();

  if (!codex.ok) {
    return errorResponse(request, redirectTo, codex.error, 500);
  }

  const logDir = skillLogDir(skill);
  mkdirSync(logDir, { recursive: true });

  const id = randomUUID();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const name = safeName(`${timestamp}-${skill}-${id.slice(0, 8)}`);
  const stdoutPath = path.join(logDir, `${name}.jsonl`);
  const stderrPath = path.join(logDir, `${name}.stderr.log`);
  const resultPath = path.join(logDir, `${name}.result.txt`);
  const prompt = buildPrompt(skill, input);
  const sandbox = skillConfig.sandbox;

  const stdoutFd = openSync(stdoutPath, "a");
  const stderrFd = openSync(stderrPath, "a");
  const globalArgs = ["--ask-for-approval", "never"];
  const execArgs = [
    "exec",
    "--json",
    "--cd",
    REPO_ROOT,
    "-o",
    resultPath
  ];

  globalArgs.push("--search");
  appendLaunchSettings(globalArgs, skillConfig);

  if (sandbox === NO_SANDBOX_MODE) {
    execArgs.push("--dangerously-bypass-approvals-and-sandbox");
  } else {
    execArgs.push("--sandbox", sandbox);
  }

  execArgs.push(prompt);

  let child;

  try {
    child = spawn(
      DEFAULT_CODEX_BIN,
      [...globalArgs, ...execArgs],
      {
        cwd: REPO_ROOT,
        detached: true,
        env: process.env,
        stdio: ["ignore", stdoutFd, stderrFd]
      }
    );
  } catch (error) {
    closeSync(stdoutFd);
    closeSync(stderrFd);

    return errorResponse(request, redirectTo, error.message, 500);
  }

  closeSync(stdoutFd);
  closeSync(stderrFd);
  child.unref();

  if (redirectTo) {
    return redirectWithStatus(request, redirectTo, {
      codexStatus: "launched",
      codexPid: child.pid,
      codexSkill: skill
    });
  }

  return json(
    {
      ok: true,
      id,
      pid: child.pid,
      skill,
      sandbox,
      launchSettings: launchSettings(skillConfig),
      cwd: REPO_ROOT,
      codexBin: DEFAULT_CODEX_BIN,
      codexVersion: codex.version,
      logDir,
      stdoutPath,
      stderrPath,
      resultPath
    },
    { status: 202 }
  );
}
