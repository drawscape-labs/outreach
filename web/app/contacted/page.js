import { PERSON_STATUS_BUCKETS } from "@/app/api/people/schema";
import ProspectStatusPage from "@/app/people/components/prospect-status-page";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function ContactedPage() {
  return (
    <ProspectStatusPage
      statuses={PERSON_STATUS_BUCKETS.contacted}
      title="Contacted"
      emptyMessage="No contacted prospects yet."
    />
  );
}
