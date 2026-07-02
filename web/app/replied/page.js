import { PERSON_STATUS_BUCKETS } from "@/app/api/people/schema";
import ProspectStatusPage from "@/app/people/components/prospect-status-page";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function RepliedPage() {
  return (
    <ProspectStatusPage
      statuses={PERSON_STATUS_BUCKETS.replied}
      title="Replied"
      emptyMessage="No replied prospects yet."
    />
  );
}
