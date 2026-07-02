"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Dropdown,
  DropdownButton,
  DropdownItem,
  DropdownMenu
} from "@/components/ui/dropdown";
import { Field, Label } from "@/components/ui/fieldset";
import { Select } from "@/components/ui/select";
import { quickmailApi } from "@/lib/api";
import { buildQuickmailPlaceholderEmail } from "@/lib/placeholder-email";

const quickmailCampaignsQueryKey = ["quickmail", "campaigns"];
const lastCampaignStorageKey = "drawscape.quickmail.lastCampaignId";

function readLastCampaignId() {
  try {
    return window.localStorage.getItem(lastCampaignStorageKey) || "";
  } catch {
    return "";
  }
}

function writeLastCampaignId(campaignId) {
  try {
    window.localStorage.setItem(lastCampaignStorageKey, campaignId);
  } catch {
    // Remembering the last campaign is a convenience; the picker still works without storage.
  }
}

function IconDots(props) {
  return (
    <svg {...props} viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="4" r="1.5" fill="currentColor" />
      <circle cx="10" cy="10" r="1.5" fill="currentColor" />
      <circle cx="10" cy="16" r="1.5" fill="currentColor" />
    </svg>
  );
}

function CampaignModal({
  personId,
  personName,
  email,
  profileKey,
  linkedinProfileUrl,
  onClose
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const campaignsQuery = useQuery({
    queryKey: quickmailCampaignsQueryKey,
    queryFn: () => quickmailApi.listCampaigns()
  });
  const campaigns = campaignsQuery.data || [];

  const addToCampaignMutation = useMutation({
    mutationFn: ({ selectedCampaign }) =>
      quickmailApi.addLeadToCampaign(
        selectedCampaign.id,
        {
          personId,
          workspaceId: selectedCampaign.workspaceId,
          markContacted: true
        }
      ),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: quickmailCampaignsQueryKey });
      setSuccess("Added to campaign.");
      router.refresh();
      window.setTimeout(onClose, 700);
    },
    onError(saveError) {
      setError(saveError.message);
    }
  });

  // The selection state only holds an explicit user choice; until then the
  // remembered campaign (or the first one) is the effective selection.
  const selectedCampaign =
    campaigns.find((campaign) => campaign.id === selectedCampaignId) ||
    campaigns.find((campaign) => campaign.id === readLastCampaignId()) ||
    campaigns[0];
  const quickmailEmail =
    email ||
    buildQuickmailPlaceholderEmail({
      personId,
      name: personName,
      profileKey,
      linkedinProfileUrl
    });
  const isLoading = campaignsQuery.isLoading;
  const isSaving = addToCampaignMutation.isPending;
  const queryError =
    campaignsQuery.isError && campaignsQuery.error
      ? campaignsQuery.error.message
      : "";
  const canSubmit = Boolean(selectedCampaign && !isLoading && !isSaving);
  const visibleError = error || queryError;

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedCampaign) {
      setError("Select a campaign.");
      return;
    }

    setError("");
    setSuccess("");
    writeLastCampaignId(selectedCampaign.id);
    addToCampaignMutation.mutate({ selectedCampaign });
  }

  function handleCampaignChange(event) {
    const campaignId = event.target.value;

    setSelectedCampaignId(campaignId);

    if (campaignId) {
      writeLastCampaignId(campaignId);
    }
  }

  return (
    <Dialog
      open
      onClose={() => {
        if (!isSaving) {
          onClose();
        }
      }}
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle>Add to campaign</DialogTitle>
        <p className="mt-1 text-sm/6 text-zinc-500 dark:text-zinc-400">{personName}</p>

        <DialogBody>
          <Field>
            <Label htmlFor={`campaign-${personId}`}>Campaign</Label>
            <Select
              id={`campaign-${personId}`}
              value={selectedCampaign?.id || ""}
              disabled={isLoading || isSaving || campaigns.length === 0}
              onChange={handleCampaignChange}
            >
              {campaigns.length ? (
                campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))
              ) : (
                <option value="">
                  {isLoading ? "Loading campaigns..." : "No campaigns found"}
                </option>
              )}
            </Select>
          </Field>

          {selectedCampaign?.workspaceName ? (
            <p className="mt-2 text-xs/5 text-zinc-500 dark:text-zinc-400">
              {selectedCampaign.workspaceName}
            </p>
          ) : null}

          {!email ? (
            <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm/6 text-amber-800 ring-1 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20">
              No email. Sending as {quickmailEmail}.
            </p>
          ) : null}

          {visibleError ? (
            <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm/6 text-rose-700 ring-1 ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/20">
              {visibleError}
            </p>
          ) : null}

          {success ? (
            <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm/6 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20">
              {success}
            </p>
          ) : null}
        </DialogBody>

        <DialogActions>
          <Button type="button" outline disabled={isSaving} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" color="teal" disabled={!canSubmit}>
            {isSaving ? "Adding..." : "Add"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export function PersonActions({
  personId,
  personName,
  email,
  profileKey,
  linkedinProfileUrl
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  function openModal() {
    setIsModalOpen(true);
  }

  return (
    <div className="flex justify-end">
      <Dropdown>
        <DropdownButton outline aria-label={`Actions for ${personName}`}>
          <IconDots data-slot="icon" />
        </DropdownButton>
        <DropdownMenu anchor="bottom end" aria-label={`Actions for ${personName}`}>
          <DropdownItem onClick={openModal}>
            Add to campaign
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>

      {isModalOpen ? (
        <CampaignModal
          personId={personId}
          personName={personName}
          email={email}
          profileKey={profileKey}
          linkedinProfileUrl={linkedinProfileUrl}
          onClose={() => setIsModalOpen(false)}
        />
      ) : null}
    </div>
  );
}
