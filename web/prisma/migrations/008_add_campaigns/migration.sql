CREATE TABLE IF NOT EXISTS "campaigns" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quickmail_campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  workspace_id TEXT,
  workspace_name TEXT,
  paused BOOLEAN NOT NULL DEFAULT 0,
  archived BOOLEAN NOT NULL DEFAULT 0,
  app_url TEXT,
  quickmail_created_at DATETIME,
  last_synced_at DATETIME,
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "campaigns_quickmail_campaign_id_idx"
ON "campaigns"("quickmail_campaign_id");
