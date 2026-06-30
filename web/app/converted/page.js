import { PERSON_STATUS_BUCKETS } from "../api/people/schema";
import ProspectStatusPage from "../people/components/prospect-status-page";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function ConvertedPage() {
  return (
    <ProspectStatusPage
      statuses={PERSON_STATUS_BUCKETS.converted}
      title="Converted"
      emptyMessage="No converted prospects yet."
    />
  );
}
