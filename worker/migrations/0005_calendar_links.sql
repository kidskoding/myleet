-- Two-way calendar sync (Google for now): one row per user and provider. The refresh
-- token is sealed with AES-256-GCM under the CALENDAR_TOKEN_KEY secret (base64 of the
-- nonce, ciphertext and tag); it is never logged or sent to the client.

CREATE TABLE calendar_links (
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  refresh_token_enc TEXT NOT NULL,
  -- The calendar we created ("myleet"); we write only there.
  calendar_id TEXT NOT NULL,
  -- events.list nextSyncToken; NULL means the next read lists everything.
  sync_token TEXT,
  -- JSON object: session key to {id, start_ms, end_ms, sig}, the events as we wrote them.
  event_map TEXT NOT NULL DEFAULT '{}',
  -- JSON array of {start_ms, end_ms} busy on the primary calendar, and when it was read.
  busy_json TEXT,
  busy_fetched_at INTEGER,
  last_synced_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, provider)
);
