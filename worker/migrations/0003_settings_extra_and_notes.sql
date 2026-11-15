-- Settings added after 0002 (appearance, weekend and one-day budgets, session moves,
-- browser reminder details, editor and onboarding prefs) as one JSON object, validated
-- by the Worker (account::Extra), so later fields need no migration. user_settings.theme
-- now also holds the Catppuccin flavors (latte, frappe, macchiato, mocha); old light
-- and dark rows read as latte and mocha.
ALTER TABLE user_settings ADD COLUMN extra TEXT NOT NULL DEFAULT '{}';

-- The Notes reader's highlights, margin notes and reading progress as one JSON object.
-- It shares the progress row and its version, so syncing it costs no extra row write.
ALTER TABLE progress ADD COLUMN notes_json TEXT;
