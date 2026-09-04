"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogTitle
} from "@/components/ui/dialog";
import { codexApi } from "@/lib/api";

function valueLine(label, value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return "";
  }

  return `${label}: ${String(value).trim()}`;
}

function buildEnrichCompanyInput(company, workspaceName) {
  return [
    `Enrich this existing ${workspaceName} company and save the updated company record through the web app API at http://localhost:4200.`,
    "Read docs/industries.md and docs/personas.md before assigning an industry or priority.",
    "Create a run directory under .codex/tmp/enrich-company/ and keep normalized input, source notes, enriched JSON, dry-run output, apply output, and logs there.",
    "Update the existing row by company ID, domain, or LinkedIn URL. Do not create a duplicate company.",
    "Set companies.date_enriched to today's ISO date when the update succeeds, then read back the row and report the changed fields.",
    "If enrichment is blocked by an identity conflict, do not write and report the conflict.",
    "",
    valueLine("Company ID", company.id),
    valueLine("Company", company.name),
    valueLine("Domain", company.domain),
    valueLine("Website", company.websiteUrl),
    valueLine("LinkedIn company URL", company.linkedinCompanyUrl),
    valueLine("Category", company.category),
    valueLine("Priority", company.priority),
    valueLine("Industry", company.industry),
    valueLine("Location", company.location),
    valueLine("Country", company.country),
    valueLine("Employee count", company.employeeCount),
    valueLine("Employee count range", company.employeeCountRange),
    valueLine("Description", company.description),
    valueLine("Notes", company.notes)
  ].filter(Boolean).join("\n");
}

function buildProspectInput({ company, people, workspaceName }) {
  const peopleLines = people
    .map((person) => {
      const name = person.personName || person.name;
      const title = person.title || person.positionTitle;

      return [name, title].filter(Boolean).join(" - ");
    })
    .filter(Boolean);

  return [
    `Prospect this existing ${workspaceName} company and save importable results through the web app API at http://localhost:4200.`,
    "Read docs/industries.md and docs/personas.md and use the personas associated with the company's industry. User-requested titles take precedence over configured defaults.",
    "This web-app action is explicit approval to import/upsert the company, people, positions, and verified emails that pass prospect-company validation through the API.",
    "Create a run directory under .codex/tmp/prospect-company/ with relevant subfolders and keep the prospect JSON, research notes, validation output, duplicate-check output, upsert output, and logs there.",
    "Validate the prospect JSON, check duplicates through the API, then run `node .codex/skills/prospect-company/scripts/upsert-prospects.js <artifact> --api-base http://localhost:4200 --apply`.",
    "Do not write generated files to data/. Do not access SQLite directly. If the API is unreachable or import is blocked, leave the database unchanged and report the failure.",
    "Do not create duplicate companies or people. If a duplicate or identity conflict is ambiguous, skip that record, do not write it, and report the conflict.",
    "After import, read back the linked people for this company through the API and report inserted, updated, skipped, and conflicted records.",
    "",
    valueLine("Company ID", company.id),
    valueLine("Company", company.name),
    valueLine("Domain", company.domain),
    valueLine("Website", company.websiteUrl),
    valueLine("LinkedIn company URL", company.linkedinCompanyUrl),
    valueLine("Category", company.category),
    valueLine("Priority", company.priority),
    valueLine("Industry", company.industry),
    valueLine("Location", company.location),
    valueLine("Country", company.country),
    peopleLines.length ? `Existing people: ${peopleLines.join("; ")}` : ""
  ].filter(Boolean).join("\n");
}

function initialLaunchState(status) {
  if (status?.state === "launched") {
    const resultDirectory = status.skill
      ? `.codex/tmp/${status.skill}/logs`
      : ".codex/tmp";

    return {
      status: "success",
      message: status.pid
        ? `Started background run PID ${status.pid}. Final result lands in ${resultDirectory}.`
        : `Started background run. Final result lands in ${resultDirectory}.`
    };
  }

  if (status?.state === "error") {
    return {
      status: "error",
      message: status.message || "Launch failed."
    };
  }

  return {
    status: "idle",
    message: ""
  };
}

const CODEX_ACTIONS = [
  {
    key: "enrich",
    label: "Enrich Company",
    skill: "enrich-company",
    summary:
      "Research this company and update its existing record with better account data.",
    effects: [
      "Reads the current company record and the targeting guidance in docs/industries.md and docs/personas.md.",
      "Researches public sources for details such as industry, location, country, headcount, description, category, and priority.",
      "Updates this company through the local web app API and records the enrichment date. It will not intentionally create a duplicate company.",
      "Skips the update and reports the issue if it encounters an ambiguous identity conflict."
    ],
    buildInput: ({ company, workspaceName }) => buildEnrichCompanyInput(company, workspaceName)
  },
  {
    key: "prospect",
    label: "Prospect & Save",
    skill: "prospect-company",
    summary:
      "Research people at this company who match your configured buyer personas and save qualified contacts.",
    effects: [
      "Reads this company, its existing contacts, and the targeting guidance in docs/industries.md and docs/personas.md.",
      "Searches public sources for relevant people, professional profiles, current roles, and work emails when available.",
      "Validates and deduplicates the results, then imports or updates the company, people, positions, and verified emails through the local web app API.",
      "Skips ambiguous identity conflicts and reports inserted, updated, skipped, and conflicted records."
    ],
    buildInput: buildProspectInput
  }
];

function ActionConfirmationDialog({ action, companyName, isLaunching, error, onClose, onLaunch }) {
  if (!action) {
    return null;
  }

  return (
    <Dialog open onClose={() => !isLaunching && onClose()} size="lg">
      <DialogTitle>{action.label}</DialogTitle>
      <DialogBody>
        <p className="text-sm/6 text-zinc-600 dark:text-zinc-300">
          {action.summary}
        </p>

        <div className="mt-5 rounded-lg bg-teal-50 p-4 ring-1 ring-teal-600/20 dark:bg-teal-400/10 dark:ring-teal-400/20">
          <p className="font-semibold text-teal-900 dark:text-teal-200">
            This launches a background Codex agent.
          </p>
          <p className="mt-1 text-sm/6 text-teal-800 dark:text-teal-300">
            The server starts a detached Codex CLI process using the ${action.skill} skill. The
            agent continues working after this modal closes and can research the web, create run
            artifacts, and make the local database changes described below.
          </p>
        </div>

        <div className="mt-5">
          <p className="text-sm font-semibold text-zinc-950 dark:text-white">
            What the agent will do for {companyName}
          </p>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm/6 text-zinc-600 marker:text-zinc-400 dark:text-zinc-300">
            {action.effects.map((effect) => (
              <li key={effect}>{effect}</li>
            ))}
          </ul>
        </div>

        <div className="mt-5 rounded-lg bg-amber-50 p-4 ring-1 ring-amber-600/20 dark:bg-amber-400/10 dark:ring-amber-400/20">
          <p className="text-sm/6 text-amber-900 dark:text-amber-200">
            This is privileged local automation. The agent runs without interactive approvals or
            sandboxing. There is no live progress view and closing this page does not cancel the
            run. Its final report and logs are saved under <code>.codex/tmp/{action.skill}/</code>.
          </p>
        </div>

        {error ? (
          <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm/6 text-rose-700 ring-1 ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/20">
            {error}
          </p>
        ) : null}
      </DialogBody>
      <DialogActions>
        <Button type="button" plain disabled={isLaunching} onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" color="teal" disabled={isLaunching} onClick={onLaunch}>
          {isLaunching ? "Launching..." : "Launch background agent"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function CompanyActions({ company, people = [], launchStatus, workspaceName }) {
  const [launchState, setLaunchState] = useState(() => initialLaunchState(launchStatus));
  const [selectedAction, setSelectedAction] = useState(null);
  const isLaunching = launchState.status === "launching";

  async function handleLaunch(action) {
    setLaunchState({
      status: "launching",
      actionKey: action.key,
      message: `Launching ${action.label}...`
    });

    try {
      const payload = await codexApi.launch({
        skill: action.skill,
        input: action.buildInput({ company, people, workspaceName })
      });

      setLaunchState({
        status: "success",
        actionKey: action.key,
        message: `${action.label} started PID ${payload.pid}. Final result lands in ${payload.logDir || `.codex/tmp/${action.skill}/logs`}.`
      });
      setSelectedAction(null);
    } catch (error) {
      setLaunchState({
        status: "error",
        actionKey: action.key,
        message: error.message
      });
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {CODEX_ACTIONS.map((action) => {
          const isCurrentAction = launchState.actionKey === action.key;

          return (
            <Button
              key={action.key}
              type="button"
              outline
              aria-label={`${action.label} ${company.name}`}
              disabled={isLaunching}
              onClick={() => {
                setLaunchState({ status: "idle", message: "" });
                setSelectedAction(action);
              }}
            >
              {isLaunching && isCurrentAction ? "Launching..." : action.label}
            </Button>
          );
        })}
      </div>

      {launchState.message ? (
        <p
          className={
            launchState.status === "error"
              ? "max-w-xs text-right text-xs/5 text-rose-600 dark:text-rose-400"
              : "max-w-xs text-right text-xs/5 text-zinc-500 dark:text-zinc-400"
          }
        >
          {launchState.message}
        </p>
      ) : null}

      <ActionConfirmationDialog
        action={selectedAction}
        companyName={company.name}
        isLaunching={isLaunching}
        error={selectedAction && launchState.status === "error" ? launchState.message : ""}
        onClose={() => setSelectedAction(null)}
        onLaunch={() => handleLaunch(selectedAction)}
      />
    </div>
  );
}
