"use client";

import { useState } from "react";
import { Button } from "../../../components/ui/button";
import { codexApi } from "../../../lib/api";

function valueLine(label, value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return "";
  }

  return `${label}: ${String(value).trim()}`;
}

function buildEnrichCompanyInput(company) {
  return [
    "Enrich this existing Drawscape Outreach company and save the updated company record to data/outreach.sqlite.",
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
    valueLine("Industry", company.industry),
    valueLine("Location", company.location),
    valueLine("Employee count", company.employeeCount),
    valueLine("Employee count range", company.employeeCountRange),
    valueLine("Description", company.description),
    valueLine("Notes", company.notes)
  ].filter(Boolean).join("\n");
}

function buildProspectInput({ company, people }) {
  const peopleLines = people
    .map((person) => {
      const name = person.personName || person.name;
      const title = person.title || person.positionTitle;

      return [name, title].filter(Boolean).join(" - ");
    })
    .filter(Boolean);

  return [
    "Prospect this existing Drawscape Outreach company and save importable results to data/outreach.sqlite.",
    "This web-app action is explicit approval to import/upsert the company, people, positions, and verified emails that pass prospect-account validation.",
    "Create the prospect JSON artifact under .codex/tmp/, validate it, check duplicates against data/outreach.sqlite, then run the prospect-account upsert script with --apply.",
    "Do not create duplicate companies or people. If a duplicate or identity conflict is ambiguous, skip that record, do not write it, and report the conflict.",
    "After import, read back the linked people for this company and report inserted, updated, skipped, and conflicted records.",
    "",
    valueLine("Company ID", company.id),
    valueLine("Company", company.name),
    valueLine("Domain", company.domain),
    valueLine("Website", company.websiteUrl),
    valueLine("LinkedIn company URL", company.linkedinCompanyUrl),
    valueLine("Category", company.category),
    valueLine("Industry", company.industry),
    valueLine("Location", company.location),
    "Desired titles: sales reps, brokers, sales managers, general managers, client-facing sales leadership",
    peopleLines.length ? `Existing people: ${peopleLines.join("; ")}` : ""
  ].filter(Boolean).join("\n");
}

function initialLaunchState(status) {
  if (status?.state === "launched") {
    return {
      status: "success",
      message: status.pid ? `Launched PID ${status.pid}` : "Launched"
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
    buildInput: ({ company }) => buildEnrichCompanyInput(company)
  },
  {
    key: "prospect",
    label: "Prospect & Save",
    skill: "prospect-account",
    buildInput: buildProspectInput
  }
];

export function CompanyActions({ company, people = [], launchStatus }) {
  const [launchState, setLaunchState] = useState(() => initialLaunchState(launchStatus));
  const isLaunching = launchState.status === "launching";

  async function handleSubmit(event, action) {
    event.preventDefault();

    setLaunchState({
      status: "launching",
      actionKey: action.key,
      message: `Launching ${action.label}...`
    });

    try {
      const payload = await codexApi.launch({
        skill: action.skill,
        input: action.buildInput({ company, people })
      });

      setLaunchState({
        status: "success",
        actionKey: action.key,
        message: `${action.label} launched PID ${payload.pid}`
      });
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
          const input = action.buildInput({ company, people });
          const isCurrentAction = launchState.actionKey === action.key;

          return (
            <form
              key={action.key}
              action="/api/codex"
              method="post"
              onSubmit={(event) => handleSubmit(event, action)}
            >
              <input type="hidden" name="skill" value={action.skill} />
              <input type="hidden" name="input" value={input} />
              <input type="hidden" name="redirectTo" value={`/companies/${company.id}`} />
              <Button
                type="submit"
                outline
                aria-label={`${action.label} ${company.name}`}
                disabled={isLaunching}
              >
                {isLaunching && isCurrentAction ? "Launching..." : action.label}
              </Button>
            </form>
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
    </div>
  );
}
