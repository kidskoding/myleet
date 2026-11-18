-- LeetCode sync without the app open: a cron reads each connected learner's public
-- profile every few hours and keeps their recent accepted problems here, so solves
-- made while myleet is closed still land on the next visit. Rows carry the username
-- they were read for, so switching accounts never mixes two people's solves.

CREATE TABLE leetcode_solves (
  user_id TEXT NOT NULL,
  -- Lowercase, as LeetCode usernames are case-insensitive.
  username TEXT NOT NULL,
  slug TEXT NOT NULL,
  solved_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, username, slug, solved_at)
);

CREATE INDEX idx_leetcode_solves_solved_at ON leetcode_solves(solved_at);

-- When the cron last read each learner, so every run starts with the longest wait.
CREATE TABLE leetcode_polls (
  user_id TEXT PRIMARY KEY,
  checked_at INTEGER NOT NULL
);
