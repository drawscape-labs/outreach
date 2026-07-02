import { LEAD_STATUS_TONES } from "@/lib/statuses";
import { EmptyValue } from "./empty-value";
import { StatusPill } from "./status-pill";

export function LeadStatus({ status }) {
  if (!status) {
    return <EmptyValue />;
  }

  return (
    <StatusPill tone={LEAD_STATUS_TONES[status] || "gray"}>
      {status}
    </StatusPill>
  );
}
