-- Planner settings, the latest computed plan, and private calendar feeds.

ALTER TABLE user_settings ADD COLUMN daily_minutes INTEGER NOT NULL DEFAULT 60;
ALTER TABLE user_settings ADD COLUMN session_minutes INTEGER NOT NULL DEFAULT 45;
-- JSON array of {days: ["mon", ...], start: "HH:MM", end: "HH:MM"}.
ALTER TABLE user_settings ADD COLUMN availability TEXT NOT NULL DEFAULT '[]';
-- JSON array of YYYY-MM-DD.
ALTER TABLE user_settings ADD COLUMN days_off TEXT NOT NULL DEFAULT '[]';
-- Minutes before a session for calendar alarms; NULL means no alarm.
ALTER TABLE user_settings ADD COLUMN reminder_minutes INTEGER DEFAULT 15;

-- One row per user: the plan the client computed last (myleet-core planner JSON),
-- replaced on each upload. The calendar feed renders from it.
CREATE TABLE plans (
  user_id TEXT PRIMARY KEY,
  plan_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- One feed per user. token_hash is the SHA-256 of the secret in the feed URL; the
-- token itself is never stored. Rotating replaces the row; revoking deletes it.
CREATE TABLE calendar_feeds (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);
