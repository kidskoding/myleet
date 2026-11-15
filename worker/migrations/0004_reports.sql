-- "I was asked this at <company>": one row per learner, problem and company. Counts
-- are shown publicly only once 3 distinct learners back one (reports::MIN_REPORTERS).
-- season is the interview month as YYYY-MM, or NULL when the learner did not say.
CREATE TABLE reports (
  user_id TEXT NOT NULL,
  problem_id TEXT NOT NULL,
  company TEXT NOT NULL,
  season TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, problem_id, company)
);

CREATE INDEX reports_by_problem ON reports (problem_id, company);
