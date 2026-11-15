-- myleet accounts and progress. Times are Unix milliseconds (UTC); ids are
-- lowercase hex. Relationships are enforced by the Worker, not foreign keys.

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  -- Lowercased and verified (by a provider or a magic link); links identities.
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at INTEGER NOT NULL
);

-- One row per way of signing in: github, google or email.
CREATE TABLE identities (
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (provider, provider_user_id)
);
CREATE INDEX idx_identities_user_id ON identities (user_id);

-- id is the SHA-256 of the cookie token, never the token itself.
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  user_agent TEXT
);
CREATE INDEX idx_sessions_user_id ON sessions (user_id);

CREATE TABLE magic_link_tokens (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  -- Set on first use; a used link never signs in again.
  used_at INTEGER
);
CREATE INDEX idx_magic_link_tokens_expires_at ON magic_link_tokens (expires_at);
CREATE INDEX idx_magic_link_tokens_email ON magic_link_tokens (email);

-- Absent row means defaults; a row is written only on the first settings change.
CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY,
  theme TEXT NOT NULL DEFAULT 'system',
  editor_keymap TEXT NOT NULL DEFAULT 'standard',
  editor_font_size INTEGER NOT NULL DEFAULT 14,
  new_per_day INTEGER NOT NULL DEFAULT 3,
  interview_date TEXT,
  -- JSON array of playlist slugs.
  target_companies TEXT NOT NULL DEFAULT '[]',
  reminders INTEGER NOT NULL DEFAULT 0,
  public_profile INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

-- One row per user: the whole events.jsonl, replaced on each sync. version guards
-- against two devices overwriting each other (stale writes get a 409).
CREATE TABLE progress (
  user_id TEXT PRIMARY KEY,
  events_jsonl TEXT NOT NULL,
  version INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  -- Client-computed public summary (streak, mastered, heatmap) as JSON.
  summary_json TEXT
);
