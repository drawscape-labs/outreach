import { revalidatePath } from "next/cache";
import {
  addQuickmailLeadsToCampaign,
  createOrReuseQuickmailLead,
  getQuickmailEnv,
  QuickmailError
} from "../../../../../../lib/quickmail";
import { buildQuickmailPlaceholderEmail } from "../../../../../../lib/placeholder-email";
import prisma from "../../../../../../lib/prisma";

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

function readIntegerId(value) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
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

async function getPersonLead(personId) {
  const id = readIntegerId(personId);

  if (!id) {
    return null;
  }

  const person = await prisma.person.findUnique({
    where: { id },
    select: {
      id: true,
      profileKey: true,
      quickmailLeadId: true,
      name: true,
      email: true,
      phoneNumber: true,
      linkedinProfileUrl: true,
      positions: {
        where: {
          isCurrent: true
        },
        orderBy: [
          { createdAt: "desc" },
          { id: "desc" }
        ],
        take: 1,
        select: {
          title: true,
          company: {
            select: {
              name: true
            }
          }
        }
      }
    }
  });

  if (!person) {
    return null;
  }

  const { firstName, lastName } = splitName(person.name);
  const currentPosition = person.positions[0];

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
      companyName: currentPosition?.company?.name,
      title: currentPosition?.title,
      phone: person.phoneNumber,
      linkedinId: person.linkedinProfileUrl
    }
  };
}

async function updatePersonAfterQuickmailSync({ personId, quickmailLeadId, markContacted }) {
  const id = readIntegerId(personId);
  const leadId = readStringId(quickmailLeadId);

  if (!id) {
    return;
  }

  if (!leadId && !markContacted) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const data = {};

    if (leadId) {
      const existingLeadOwner = await tx.person.findFirst({
        where: {
          quickmailLeadId: leadId,
          NOT: {
            id
          }
        },
        select: {
          id: true
        }
      });

      if (!existingLeadOwner) {
        data.quickmailLeadId = leadId;
      }
    }

    if (markContacted) {
      data.status = "Contacted";
    }

    if (Object.keys(data).length) {
      await tx.person.update({
        where: { id },
        data,
        select: { id: true }
      });
    }
  });

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
        const personLead = await getPersonLead(payload.personId);

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
      await updatePersonAfterQuickmailSync({
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
