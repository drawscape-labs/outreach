import ProspectStatusPage from "../people/components/prospect-status-page";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function RepliedPage() {
  return (
    <ProspectStatusPage
      statuses={["Replied"]}
      title="Replied"
      emptyMessage="No replied prospects yet."
    />
  );
}
