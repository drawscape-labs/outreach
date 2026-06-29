import { revalidatePath } from "next/cache";
import { query, sqlInteger } from "../../../../../../lib/db";
import {
  addQuickmailLeadsToCampaign,
  createOrReuseQuickmailLead,
  getQuickmailEnv,
  QuickmailError
} from "../../../../../../lib/quickmail";
import { buildQuickmailPlaceholderEmail } from "../../../../../../lib/placeholder-email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const leadStringFields = [
  "email",
  "firstName",
  "lastName",
  "companyId",
  "companyName",
  "title",
  "role",
  "phone",
  "linkedinId",
  "language"
];

function jsonError(error, status = 400, details) {
  return Response.json(
    {
      error,
      ...(details ? { details } : {})
    },
    { status }
  );
}

function readStringId(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function sqlString(value) {
  if (value === null || value === undefined || value === "") {
    return "NULL";
  }

  return `'${String(value).replace(/'/g, "''")}'`;
}

function splitName(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return {};
  }

  if (parts.length === 1) {
    return { firstName: parts[0] };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" ")
  };
}

function cleanLeadInput(lead) {
  const cleanLead = {};

  for (const field of leadStringFields) {
    const value = lead?.[field];

    if (typeof value === "string" && value.trim()) {
      cleanLead[field] = value.trim();
    }
  }

  if (Number.isInteger(lead?.score)) {
    cleanLead.score = lead.score;
  }

  if (!cleanLead.email) {
    return { error: "Lead email is required." };
  }

  if (!cleanLead.email.includes("@")) {
    return { error: "Lead email must be a valid email address." };
  }

  return { lead: cleanLead };
}

function getPersonLead(personId) {
  const id = sqlInteger(personId);

  if (!id) {
    return null;
  }

  const people = query(`
    SELECT
      p.id,
      p.profile_key AS profileKey,
      p.quickmail_lead_id AS quickmailLeadId,
      p.name,
      p.email,
      p.linkedin_profile_url AS linkedinProfileUrl,
      pos.title,
      c.name AS companyName
    FROM people p
    LEFT JOIN positions pos ON pos.person_id = p.id AND pos.is_current = 1
    LEFT JOIN companies c ON c.id = pos.company_id
    WHERE p.id = ${id}
    ORDER BY pos.created_at DESC, pos.id DESC
    LIMIT 1;
  `);

  const person = people[0];

  if (!person) {
    return null;
  }

  const { firstName, lastName } = splitName(person.name);

  return {
    localPersonId: person.id,
    quickmailLeadId: person.quickmailLeadId,
    lead: {
      email:
        person.email ||
        buildQuickmailPlaceholderEmail({
          personId: person.id,
          name: person.name,
          profileKey: person.profileKey,
          linkedinProfileUrl: person.linkedinProfileUrl
        }),
      firstName,
      lastName,
      companyName: person.companyName,
      title: person.title,
      linkedinId: person.linkedinProfileUrl
    }
  };
}

function updatePersonAfterQuickmailSync({ personId, quickmailLeadId, markContacted }) {
  const id = sqlInteger(personId);
  const leadId = readStringId(quickmailLeadId);

  if (!id) {
    return;
  }

  if (!leadId && !markContacted) {
    return;
  }

  if (leadId) {
    query(`
      UPDATE OR IGNORE people
      SET quickmail_lead_id = ${sqlString(leadId)}
      WHERE id = ${id};
    `);
  }

  if (markContacted) {
    query(`
      UPDATE people
      SET status = 'Contacted'
      WHERE id = ${id};
    `);
  }

  revalidatePath("/people");
  revalidatePath("/contacted");
  revalidatePath("/companies");
}

async function readPayload(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function POST(request, context) {
  const { campaignId: rawCampaignId } = await context.params;
  const campaignId = readStringId(rawCampaignId);

  if (!campaignId) {
    return jsonError("Invalid campaign id.");
  }

  const payload = await readPayload(request);

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return jsonError("Request body must be a JSON object.");
  }

  const workspaceId =
    readStringId(payload.workspaceId) ||
    readStringId(getQuickmailEnv("QUICKMAIL_WORKSPACE_ID"));
  const existingLeadId = readStringId(payload.leadId);
  const hasPersonId = payload.personId !== undefined;
  const hasLeadInput = payload.lead !== undefined;
  const sourceCount = [Boolean(existingLeadId), hasPersonId, hasLeadInput].filter(Boolean).length;

  if (sourceCount !== 1) {
    return jsonError("Provide exactly one of leadId, personId, or lead.");
  }

  let quickmailLead;
  let quickmailLeadAction = existingLeadId ? "provided" : "";
  let localPersonId = null;

  try {
    if (existingLeadId) {
      quickmailLead = { id: existingLeadId };
    } else {
      let leadInput = payload.lead;

      if (hasPersonId) {
        const personLead = getPersonLead(payload.personId);

        if (!personLead) {
          return jsonError("Person not found.", 404);
        }

        localPersonId = personLead.localPersonId;
        if (personLead.quickmailLeadId) {
          quickmailLead = { id: personLead.quickmailLeadId };
          quickmailLeadAction = "stored";
        } else {
          leadInput = personLead.lead;
        }
      }

      if (!quickmailLead) {
        if (!workspaceId) {
          return jsonError("workspaceId is required to create a QuickMail lead.");
        }

        const cleaned = cleanLeadInput(leadInput);

        if (cleaned.error) {
          return jsonError(cleaned.error);
        }

        const quickmailLeadResult = await createOrReuseQuickmailLead({
          workspaceId,
          lead: cleaned.lead
        });
        quickmailLead = quickmailLeadResult.lead;
        quickmailLeadAction = quickmailLeadResult.action;
      }
    }

    const result = await addQuickmailLeadsToCampaign({
      campaignId,
      leadIds: [quickmailLead.id]
    });

    if (localPersonId) {
      updatePersonAfterQuickmailSync({
        personId: localPersonId,
        quickmailLeadId: quickmailLead.id,
        markContacted: payload.markContacted === true
      });
    }

    return Response.json({
      lead: result.leads.find((lead) => lead.id === quickmailLead.id) || quickmailLead,
      campaign: result.campaign,
      quickmailLeadAction
    });
  } catch (error) {
    if (error instanceof QuickmailError) {
      return jsonError(error.message, error.status, error.details);
    }

    return jsonError("Could not add lead to QuickMail campaign.", 500);
  }
}
