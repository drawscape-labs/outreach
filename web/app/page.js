import ProspectStatusPage from "./people/components/prospect-status-page";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function HomePage() {
  return (
    <ProspectStatusPage
      statuses={["Replied", "Converted"]}
      title="Replied prospects"
      emptyMessage="No replied prospects yet."
    />
  );
}
