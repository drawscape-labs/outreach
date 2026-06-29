import ProspectStatusPage from "../people/components/prospect-status-page";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function ConvertedPage() {
  return (
    <ProspectStatusPage
      statuses={["Converted"]}
      title="Converted"
      emptyMessage="No converted prospects yet."
    />
  );
}
