"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { campaignsApi } from "@/lib/api";

function syncMessage(summary) {
  const parts = [];

  if (summary.created) {
    parts.push(`${summary.created} added`);
  }

  if (summary.updated) {
    parts.push(`${summary.updated} updated`);
  }

  if (summary.archived) {
    parts.push(`${summary.archived} archived`);
  }

  return parts.length ? `Synced: ${parts.join(", ")}.` : "Already up to date.";
}

export function SyncButton() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const syncMutation = useMutation({
    mutationFn: () => campaignsApi.sync(),
    onSuccess(payload) {
      setError("");
      setMessage(syncMessage(payload.summary || {}));
      router.refresh();
    },
    onError(syncError) {
      setMessage("");
      setError(syncError.message);
    }
  });
  const isSyncing = syncMutation.isPending;

  return (
    <div className="flex items-center gap-3">
      {message ? (
        <p className="text-sm/6 text-zinc-500 dark:text-zinc-400">{message}</p>
      ) : null}
      {error ? (
        <p className="text-sm/6 text-rose-600 dark:text-rose-400">{error}</p>
      ) : null}
      <Button
        color="teal"
        disabled={isSyncing}
        onClick={() => syncMutation.mutate()}
      >
        {isSyncing ? "Syncing..." : "Sync from QuickMail"}
      </Button>
    </div>
  );
}
