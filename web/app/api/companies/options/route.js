import { handleApiError } from "@/app/api/lib/model-helpers";
import { listCompanyOptions } from "@/app/api/companies/model";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const options = await listCompanyOptions();

    return Response.json({ options });
  } catch (error) {
    return handleApiError(error);
  }
}
