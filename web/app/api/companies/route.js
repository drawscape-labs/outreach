import { collectionHandlers } from "../../../lib/crud-routes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const handlers = collectionHandlers("companies");

export const GET = handlers.GET;
export const POST = handlers.POST;
