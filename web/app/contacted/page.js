import ProspectStatusPage from "../people/components/prospect-status-page";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function ContactedPage() {
  return (
    <ProspectStatusPage
      statuses={["Contacted", "Replied"]}
      title="Contacted"
      emptyMessage="No contacted prospects yet."
    />
  );
}
