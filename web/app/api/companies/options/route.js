import { handleApiError } from "../../lib/model-helpers";
import { listCompanyOptions } from "../model";

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
