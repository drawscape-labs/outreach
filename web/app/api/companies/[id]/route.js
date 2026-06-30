import {
  handleApiError,
  jsonError,
  readId,
  readPayload
} from "../../lib/model-helpers";
import {
  companyJson,
  deleteCompany,
  getCompany,
  revalidateCompany,
  updateCompany
} from "../model";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const notFoundMessage = "Company not found.";

export async function GET(_request, context) {
  try {
    const id = await readId(context, "company");
    const company = await getCompany(id);

    if (!company) {
      return jsonError(notFoundMessage, 404);
    }

    return Response.json({ company: companyJson(company) });
  } catch (error) {
    return handleApiError(error, { notFoundMessage });
  }
}

export async function PATCH(request, context) {
  try {
    const id = await readId(context, "company");
    const payload = await readPayload(request);
    const company = await updateCompany(id, payload);

    if (!company) {
      return jsonError(notFoundMessage, 404);
    }

    revalidateCompany(company);

    return Response.json({ company: companyJson(company) });
  } catch (error) {
    return handleApiError(error, { notFoundMessage });
  }
}

export async function DELETE(_request, context) {
  try {
    const id = await readId(context, "company");
    const company = await deleteCompany(id);

    if (!company) {
      return jsonError(notFoundMessage, 404);
    }

    revalidateCompany(company);

    return Response.json({
      deleted: true,
      company: companyJson(company)
    });
  } catch (error) {
    return handleApiError(error, { notFoundMessage });
  }
}
