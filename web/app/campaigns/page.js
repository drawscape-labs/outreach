import {
  DataTable,
  EmptyValue,
  ExternalAnchor,
  PageHeader,
  PageShell,
  StatusPill,
  TableBody,
  TableCell,
  TableEmpty,
  TableFrame,
  TableHead,
  TableHeader,
  TableRow
} from "@/components";
import { formatDate, formatDateTime } from "@/lib/format-date";
import { campaignJson, listCampaigns } from "@/app/api/campaigns/model";
import { SyncButton } from "./components/sync-button";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function CampaignStatus({ campaign }) {
  if (campaign.archived) {
    return <StatusPill tone="gray">Archived</StatusPill>;
  }

  if (campaign.paused) {
    return <StatusPill tone="amber">Paused</StatusPill>;
  }

  return <StatusPill tone="emerald">Active</StatusPill>;
}

export default async function CampaignsPage() {
  const campaigns = (await listCampaigns()).map(campaignJson);

  return (
    <PageShell>
      <PageHeader eyebrow="Outreach" title="Campaigns">
        <SyncButton />
      </PageHeader>
      <section className="mt-6">
        <TableFrame label="Campaigns table">
          <DataTable>
            <TableHead>
              <TableRow>
                <TableHeader scope="col">Name</TableHeader>
                <TableHeader scope="col">Status</TableHeader>
                <TableHeader scope="col" className="hidden sm:table-cell">
                  Workspace
                </TableHeader>
                <TableHeader scope="col" className="hidden lg:table-cell">
                  Created
                </TableHeader>
                <TableHeader scope="col" className="hidden lg:table-cell">
                  Last Synced
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {campaigns.length === 0 ? (
                <TableEmpty colSpan={5}>
                  No campaigns yet. Sync from QuickMail to load them.
                </TableEmpty>
              ) : (
                campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="w-full max-w-0 font-medium text-zinc-950 dark:text-white sm:w-auto sm:max-w-none">
                      <div className="min-w-0 truncate">
                        <ExternalAnchor href={campaign.appUrl} missingLabel={campaign.name}>
                          {campaign.name}
                        </ExternalAnchor>
                      </div>
                      <div className="mt-1 truncate text-sm font-normal text-gray-500 dark:text-zinc-400 sm:hidden">
                        {campaign.workspaceName || ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      <CampaignStatus campaign={campaign} />
                    </TableCell>
                    <TableCell className="hidden text-zinc-500 dark:text-zinc-400 sm:table-cell">
                      {campaign.workspaceName || <EmptyValue />}
                    </TableCell>
                    <TableCell
                      className="hidden text-zinc-500 dark:text-zinc-400 lg:table-cell"
                      title={campaign.quickmailCreatedAt || undefined}
                    >
                      {formatDate(campaign.quickmailCreatedAt) || <EmptyValue />}
                    </TableCell>
                    <TableCell
                      className="hidden text-zinc-500 dark:text-zinc-400 lg:table-cell"
                      title={campaign.lastSyncedAt || undefined}
                    >
                      {formatDateTime(campaign.lastSyncedAt) || <EmptyValue />}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </DataTable>
        </TableFrame>
      </section>
    </PageShell>
  );
}
