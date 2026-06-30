import { handleApiError, readPayload } from "../lib/model-helpers";
import {
  companyJson,
  createCompany,
  listCompanies,
  revalidateCompany
} from "./model";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const companies = await listCompanies(searchParams);

    return Response.json({ companies: companies.map(companyJson) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request) {
  try {
    const payload = await readPayload(request);
    const company = await createCompany(payload);

    revalidateCompany(company);

    return Response.json({ company: companyJson(company) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
