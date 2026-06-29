import { itemHandlers } from "../../../../lib/crud-routes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const handlers = itemHandlers("positions");

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
