//! Accounts: email and username rules, settings, sign-in resolution and the
//! opt-in public summary.

use std::collections::BTreeMap;

use myleet_core::planner::{self, Interview, Move, Window};
use serde::{Deserialize, Deserializer, Serialize};

pub const USERNAME_MIN: usize = 3;
pub const USERNAME_MAX: usize = 30;
const DISPLAY_NAME_MAX_CHARS: usize = 60;
const EMAIL_MAX: usize = 254;
const RESERVED_USERNAMES: &[&str] = &[
    "about",
    "admin",
    "api",
    "app",
    "auth",
    "help",
    "login",
    "logout",
    "me",
    "myleet",
    "new",
    "null",
    "privacy",
    "root",
    "settings",
    "signin",
    "signup",
    "static",
    "support",
    "terms",
    "u",
    "undefined",
    "www",
];

/// Lowercased address, or `None` if it is not plausibly deliverable. Deliberately
/// loose: the magic link itself proves the address works.
pub fn normalize_email(raw: &str) -> Option<String> {
    let email = raw.trim().to_ascii_lowercase();
    let (local, domain) = email.split_once('@')?;
    let ok = email.len() <= EMAIL_MAX
        && !local.is_empty()
        && local.len() <= 64
        && domain.contains('.')
        && !domain.starts_with('.')
        && !domain.ends_with('.')
        && !domain.contains('@')
        && email.chars().all(|c| {
            c.is_ascii_graphic()
                && !matches!(
                    c,
                    '<' | '>' | '"' | ',' | ';' | '(' | ')' | '\\' | '[' | ']'
                )
        });
    ok.then_some(email)
}

/// Lowercase letters, digits, `-` and `_`; starts with a letter or digit; not a
/// route name. Usernames appear in URLs (`/u/<name>`), so the rules are strict.
pub fn validate_username(name: &str) -> Result<(), String> {
    if !(USERNAME_MIN..=USERNAME_MAX).contains(&name.len()) {
        return Err(format!(
            "username must be {USERNAME_MIN}-{USERNAME_MAX} characters"
        ));
    }
    if !name
        .bytes()
        .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-' || b == b'_')
    {
        return Err("username may use only a-z, 0-9, - and _".to_string());
    }
    if !name.as_bytes()[0].is_ascii_alphanumeric() {
        return Err("username must start with a letter or digit".to_string());
    }
    if RESERVED_USERNAMES.contains(&name) {
        return Err("that username is reserved".to_string());
    }
    Ok(())
}

/// A valid username derived from a provider login or email local part. The caller
/// appends a random suffix when it is taken.
pub fn username_from_hint(hint: &str, fallback_suffix: &str) -> String {
    let mut out = String::new();
    for c in hint.chars().flat_map(char::to_lowercase) {
        let c = if c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_' {
            c
        } else {
            '-'
        };
        if !(c == '-' && (out.is_empty() || out.ends_with('-'))) {
            out.push(c);
        }
    }
    let mut out: String = out.trim_matches(|c| c == '-' || c == '_').to_string();
    out.truncate(USERNAME_MAX - fallback_suffix.len() - 1);
    let out = out.trim_end_matches(['-', '_']);
    if out.len() < USERNAME_MIN || RESERVED_USERNAMES.contains(&out) {
        return with_suffix("user", fallback_suffix);
    }
    out.to_string()
}

pub fn with_suffix(base: &str, suffix: &str) -> String {
    let mut base = base.to_string();
    base.truncate(USERNAME_MAX - suffix.len() - 1);
    format!("{}-{suffix}", base.trim_end_matches(['-', '_']))
}

pub fn validate_display_name(name: &str) -> Result<String, String> {
    let name = name.trim();
    if name.chars().count() > DISPLAY_NAME_MAX_CHARS {
        return Err(format!(
            "display_name is over {DISPLAY_NAME_MAX_CHARS} characters"
        ));
    }
    if name.chars().any(char::is_control) {
        return Err("display_name has control characters".to_string());
    }
    Ok(name.to_string())
}

/// How a sign-in maps onto accounts, given what D1 already holds.
#[derive(Debug, PartialEq, Eq)]
pub enum Resolution {
    /// This provider identity is already linked.
    Existing(String),
    /// A user with this verified email exists: link the new identity to it.
    Link(String),
    Create,
}

pub fn resolve(identity_user: Option<String>, email_user: Option<String>) -> Resolution {
    match (identity_user, email_user) {
        (Some(id), _) => Resolution::Existing(id),
        (None, Some(id)) => Resolution::Link(id),
        (None, None) => Resolution::Create,
    }
}

/// `system` follows the OS between `latte` and the night flavor. Rows written before
/// the Catppuccin themes hold `light` and `dark`, read as `latte` and `mocha`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    System,
    #[serde(alias = "light")]
    Latte,
    Frappe,
    Macchiato,
    #[serde(alias = "dark")]
    Mocha,
}

/// The dark flavor `system` uses at night.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum NightFlavor {
    Frappe,
    Macchiato,
    #[default]
    Mocha,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Accent {
    Rosewater,
    Flamingo,
    Pink,
    #[default]
    Mauve,
    Red,
    Maroon,
    Peach,
    Yellow,
    Green,
    Teal,
    Sky,
    Sapphire,
    Blue,
    Lavender,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Goal {
    Internship,
    Coop,
    Newgrad,
}

/// Minutes per difficulty.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TimeTargets {
    pub easy: u32,
    pub medium: u32,
    pub hard: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Keymap {
    Standard,
    Vim,
}

const FONT_SIZES: std::ops::RangeInclusive<u32> = 10..=28;
const NEW_PER_DAY: std::ops::RangeInclusive<u32> = 0..=20;
const MAX_TARGET_COMPANIES: usize = 40;
const MAX_COMPANY_SLUG: usize = 40;
const MAX_INTERVIEWS: usize = 20;
const DAILY_MINUTES: std::ops::RangeInclusive<u32> = 15..=600;
const SESSION_MINUTES: std::ops::RangeInclusive<u32> = 15..=240;
const REMINDER_MINUTES: std::ops::RangeInclusive<u32> = 0..=1440;
const MAX_WINDOWS: usize = 21;
const MAX_DAYS_OFF: usize = 366;
const DAY_BUDGET_MINUTES: std::ops::RangeInclusive<u32> = 0..=600;
const MOVE_MINUTES: std::ops::RangeInclusive<u32> = 1..=1440;
const MAX_DAY_BUDGETS: usize = 100;
const MAX_MOVES: usize = 100;
const TIME_TARGET_MINUTES: std::ops::RangeInclusive<u32> = 1..=240;
/// The `extra` column; the caps above keep it far below this.
pub const MAX_EXTRA_BYTES: usize = 32 * 1024;

/// Settings added after migration 0002, stored as one JSON object (`user_settings.extra`)
/// so new fields need no migration. Flattened into [`Settings`] on the wire. Optional
/// fields are absent until first set, so a device that already has a value keeps it and
/// uploads it instead of taking a default; `Some(None)` is an explicit `null`.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default)]
pub struct Extra {
    pub night_flavor: NightFlavor,
    pub accent: Accent,
    /// Saturday and Sunday budget; `null` means the same as `daily_minutes`.
    #[serde(deserialize_with = "present", skip_serializing_if = "Option::is_none")]
    pub weekend_minutes: Option<Option<u32>>,
    /// One-day budgets ("Shorter day", skipped sessions), YYYY-MM-DD to minutes.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub day_minutes: Option<BTreeMap<String, u32>>,
    /// Sessions dragged to another window or day.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub moves: Option<Vec<Move>>,
    /// Browser reminders: `HH:MM` on a day with no planned session.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reminder_time: Option<String>,
    /// Browser reminders: minutes before a planned session.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reminder_lead: Option<u32>,
    /// No browser reminders from `quiet_from` to `quiet_to` (`HH:MM`, may wrap midnight).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quiet_from: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quiet_to: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub time_targets: Option<TimeTargets>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reduce_motion: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub editor_ligatures: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub editor_minimap: Option<bool>,
    /// 2 or 4 spaces.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub editor_indent: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub editor_format_on_save: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub editor_run_on_save: Option<bool>,
    #[serde(deserialize_with = "present", skip_serializing_if = "Option::is_none")]
    pub goal: Option<Option<Goal>>,
    /// YYYY-MM-DD the plan was made.
    #[serde(deserialize_with = "present", skip_serializing_if = "Option::is_none")]
    pub plan_started_at: Option<Option<String>>,
    /// Finished or skipped onboarding.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub onboarded: Option<bool>,
    /// Every interview, each with a date and an optional company slug.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub interviews: Option<Vec<Interview>>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Settings {
    pub theme: Theme,
    pub editor_keymap: Keymap,
    pub editor_font_size: u32,
    pub new_per_day: u32,
    /// YYYY-MM-DD.
    pub interview_date: Option<String>,
    /// Playlist slugs, e.g. `google`.
    pub target_companies: Vec<String>,
    pub reminders: bool,
    pub public_profile: bool,
    /// Planner budget per day.
    pub daily_minutes: u32,
    /// Preferred length of one practice session.
    pub session_minutes: u32,
    /// Weekly practice windows; empty means "plan around my usual hour".
    pub availability: Vec<Window>,
    /// YYYY-MM-DD dates with no practice.
    pub days_off: Vec<String>,
    /// Calendar-feed reminder lead time; `None` for no alarm.
    pub reminder_minutes: Option<u32>,
    #[serde(flatten)]
    pub extra: Extra,
}

impl Default for Settings {
    fn default() -> Settings {
        Settings {
            theme: Theme::System,
            editor_keymap: Keymap::Standard,
            editor_font_size: 14,
            new_per_day: 3,
            interview_date: None,
            target_companies: Vec::new(),
            reminders: false,
            public_profile: false,
            daily_minutes: 60,
            session_minutes: 45,
            availability: Vec::new(),
            days_off: Vec::new(),
            reminder_minutes: Some(15),
            extra: Extra::default(),
        }
    }
}

// Distinguishes an explicit `null` (clear the field) from an absent key.
fn present<'de, D: Deserializer<'de>, T: Deserialize<'de>>(d: D) -> Result<Option<T>, D::Error> {
    T::deserialize(d).map(Some)
}

#[derive(Debug, Default, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SettingsPatch {
    pub theme: Option<Theme>,
    pub editor_keymap: Option<Keymap>,
    pub editor_font_size: Option<u32>,
    pub new_per_day: Option<u32>,
    #[serde(default, deserialize_with = "present")]
    pub interview_date: Option<Option<String>>,
    pub target_companies: Option<Vec<String>>,
    pub reminders: Option<bool>,
    pub public_profile: Option<bool>,
    pub daily_minutes: Option<u32>,
    pub session_minutes: Option<u32>,
    pub availability: Option<Vec<Window>>,
    pub days_off: Option<Vec<String>>,
    #[serde(default, deserialize_with = "present")]
    pub reminder_minutes: Option<Option<u32>>,
    pub night_flavor: Option<NightFlavor>,
    pub accent: Option<Accent>,
    #[serde(default, deserialize_with = "present")]
    pub weekend_minutes: Option<Option<u32>>,
    pub day_minutes: Option<BTreeMap<String, u32>>,
    pub moves: Option<Vec<Move>>,
    pub reminder_time: Option<String>,
    pub reminder_lead: Option<u32>,
    pub quiet_from: Option<String>,
    pub quiet_to: Option<String>,
    pub time_targets: Option<TimeTargets>,
    pub reduce_motion: Option<bool>,
    pub editor_ligatures: Option<bool>,
    pub editor_minimap: Option<bool>,
    pub editor_indent: Option<u32>,
    pub editor_format_on_save: Option<bool>,
    pub editor_run_on_save: Option<bool>,
    #[serde(default, deserialize_with = "present")]
    pub goal: Option<Option<Goal>>,
    #[serde(default, deserialize_with = "present")]
    pub plan_started_at: Option<Option<String>>,
    pub onboarded: Option<bool>,
    pub interviews: Option<Vec<Interview>>,
}

impl Settings {
    pub fn apply(&self, patch: SettingsPatch) -> Result<Settings, String> {
        let mut s = self.clone();
        s.extra = self.extra.apply(&patch)?;
        if let Some(v) = patch.theme {
            s.theme = v;
        }
        if let Some(v) = patch.editor_keymap {
            s.editor_keymap = v;
        }
        if let Some(v) = patch.editor_font_size {
            if !FONT_SIZES.contains(&v) {
                return Err(format!("editor_font_size must be in {FONT_SIZES:?}"));
            }
            s.editor_font_size = v;
        }
        if let Some(v) = patch.new_per_day {
            if !NEW_PER_DAY.contains(&v) {
                return Err(format!("new_per_day must be in {NEW_PER_DAY:?}"));
            }
            s.new_per_day = v;
        }
        if let Some(v) = patch.interview_date {
            if let Some(d) = &v
                && !valid_date(d)
            {
                return Err("interview_date must be YYYY-MM-DD".to_string());
            }
            s.interview_date = v;
        }
        if let Some(v) = patch.target_companies {
            if v.len() > MAX_TARGET_COMPANIES {
                return Err(format!("at most {MAX_TARGET_COMPANIES} target_companies"));
            }
            if !v.iter().all(|c| valid_slug(c, MAX_COMPANY_SLUG)) {
                return Err("target_companies must be playlist slugs".to_string());
            }
            s.target_companies = v;
        }
        if let Some(v) = patch.reminders {
            s.reminders = v;
        }
        if let Some(v) = patch.public_profile {
            s.public_profile = v;
        }
        if let Some(v) = patch.daily_minutes {
            if !DAILY_MINUTES.contains(&v) {
                return Err(format!("daily_minutes must be in {DAILY_MINUTES:?}"));
            }
            s.daily_minutes = v;
        }
        if let Some(v) = patch.session_minutes {
            if !SESSION_MINUTES.contains(&v) {
                return Err(format!("session_minutes must be in {SESSION_MINUTES:?}"));
            }
            s.session_minutes = v;
        }
        if let Some(v) = patch.availability {
            if v.len() > MAX_WINDOWS {
                return Err(format!("at most {MAX_WINDOWS} availability windows"));
            }
            planner::validate_windows(&v)?;
            s.availability = v;
        }
        if let Some(v) = patch.days_off {
            if v.len() > MAX_DAYS_OFF {
                return Err(format!("at most {MAX_DAYS_OFF} days_off"));
            }
            if !v.iter().all(|d| valid_date(d)) {
                return Err("days_off must be YYYY-MM-DD".to_string());
            }
            s.days_off = v;
        }
        if let Some(v) = patch.reminder_minutes {
            if v.is_some_and(|m| !REMINDER_MINUTES.contains(&m)) {
                return Err(format!(
                    "reminder_minutes must be in {REMINDER_MINUTES:?} or null"
                ));
            }
            s.reminder_minutes = v;
        }
        Ok(s)
    }
}

fn valid_clock(s: &str) -> bool {
    planner::parse_hhmm(s, false).is_some()
}

impl Extra {
    fn apply(&self, p: &SettingsPatch) -> Result<Extra, String> {
        let mut x = self.clone();
        if let Some(v) = p.night_flavor {
            x.night_flavor = v;
        }
        if let Some(v) = p.accent {
            x.accent = v;
        }
        if let Some(v) = p.weekend_minutes {
            if v.is_some_and(|m| !DAILY_MINUTES.contains(&m)) {
                return Err(format!(
                    "weekend_minutes must be in {DAILY_MINUTES:?} or null"
                ));
            }
            x.weekend_minutes = Some(v);
        }
        if let Some(v) = p.day_minutes.clone() {
            if v.len() > MAX_DAY_BUDGETS {
                return Err(format!("at most {MAX_DAY_BUDGETS} day_minutes"));
            }
            if !v
                .iter()
                .all(|(d, m)| valid_date(d) && DAY_BUDGET_MINUTES.contains(m))
            {
                return Err(format!(
                    "day_minutes must map YYYY-MM-DD to minutes in {DAY_BUDGET_MINUTES:?}"
                ));
            }
            x.day_minutes = Some(v);
        }
        if let Some(v) = p.moves.clone() {
            if v.len() > MAX_MOVES {
                return Err(format!("at most {MAX_MOVES} moves"));
            }
            let ok = |m: &Move| {
                valid_date(&m.from)
                    && valid_date(&m.to)
                    && valid_clock(&m.from_start)
                    && valid_clock(&m.to_start)
                    && MOVE_MINUTES.contains(&m.minutes)
            };
            if !v.iter().all(ok) {
                return Err(format!(
                    "moves need YYYY-MM-DD dates, HH:MM starts and minutes in {MOVE_MINUTES:?}"
                ));
            }
            x.moves = Some(v);
        }
        for (name, v, slot) in [
            (
                "reminder_time",
                p.reminder_time.clone(),
                &mut x.reminder_time,
            ),
            ("quiet_from", p.quiet_from.clone(), &mut x.quiet_from),
            ("quiet_to", p.quiet_to.clone(), &mut x.quiet_to),
        ] {
            if let Some(v) = v {
                if !valid_clock(&v) {
                    return Err(format!("{name} must be HH:MM"));
                }
                *slot = Some(v);
            }
        }
        if let Some(v) = p.reminder_lead {
            if !REMINDER_MINUTES.contains(&v) {
                return Err(format!("reminder_lead must be in {REMINDER_MINUTES:?}"));
            }
            x.reminder_lead = Some(v);
        }
        if let Some(v) = p.time_targets {
            if ![v.easy, v.medium, v.hard]
                .iter()
                .all(|m| TIME_TARGET_MINUTES.contains(m))
            {
                return Err(format!(
                    "time_targets must be minutes in {TIME_TARGET_MINUTES:?}"
                ));
            }
            x.time_targets = Some(v);
        }
        if let Some(v) = p.editor_indent {
            if v != 2 && v != 4 {
                return Err("editor_indent must be 2 or 4".to_string());
            }
            x.editor_indent = Some(v);
        }
        if let Some(v) = p.plan_started_at.clone() {
            if v.as_deref().is_some_and(|d| !valid_date(d)) {
                return Err("plan_started_at must be YYYY-MM-DD or null".to_string());
            }
            x.plan_started_at = Some(v);
        }
        for (v, slot) in [
            (p.reduce_motion, &mut x.reduce_motion),
            (p.editor_ligatures, &mut x.editor_ligatures),
            (p.editor_minimap, &mut x.editor_minimap),
            (p.editor_format_on_save, &mut x.editor_format_on_save),
            (p.editor_run_on_save, &mut x.editor_run_on_save),
            (p.onboarded, &mut x.onboarded),
        ] {
            if v.is_some() {
                *slot = v;
            }
        }
        if let Some(v) = p.goal {
            x.goal = Some(v);
        }
        if let Some(v) = p.interviews.clone() {
            if v.len() > MAX_INTERVIEWS {
                return Err(format!("at most {MAX_INTERVIEWS} interviews"));
            }
            if !v.iter().all(|i| {
                valid_date(&i.date)
                    && i.company
                        .as_deref()
                        .is_none_or(|c| valid_slug(c, MAX_COMPANY_SLUG))
            }) {
                return Err(
                    "interviews need a YYYY-MM-DD date and an optional playlist slug".to_string(),
                );
            }
            // The plan fills in display names; settings keep only the slug.
            x.interviews = Some(
                v.into_iter()
                    .map(|i| Interview { name: None, ..i })
                    .collect(),
            );
        }
        if serde_json::to_string(&x).map_or(usize::MAX, |j| j.len()) > MAX_EXTRA_BYTES {
            return Err(format!("settings are over {MAX_EXTRA_BYTES} bytes"));
        }
        Ok(x)
    }
}

/// Company slugs are playlist ids without the `NNN_` prefix, so `_` is allowed
/// (`salesforce_slack`).
fn valid_slug(s: &str, max: usize) -> bool {
    !s.is_empty()
        && s.len() <= max
        && s.bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-' || b == b'_')
}

/// A real calendar date in YYYY-MM-DD.
pub fn valid_date(s: &str) -> bool {
    let b = s.as_bytes();
    if b.len() != 10 || b[4] != b'-' || b[7] != b'-' {
        return false;
    }
    let num = |r: std::ops::Range<usize>| s.get(r).and_then(|p| p.parse::<u32>().ok());
    let (Some(y), Some(m), Some(d)) = (num(0..4), num(5..7), num(8..10)) else {
        return false;
    };
    if !s
        .bytes()
        .enumerate()
        .all(|(i, c)| i == 4 || i == 7 || c.is_ascii_digit())
    {
        return false;
    }
    let leap = y % 4 == 0 && (y % 100 != 0 || y % 400 == 0);
    let days = match m {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if leap => 29,
        2 => 28,
        _ => return false,
    };
    (1..=days).contains(&d)
}

impl Theme {
    pub fn as_str(self) -> &'static str {
        match self {
            Theme::System => "system",
            Theme::Latte => "latte",
            Theme::Frappe => "frappe",
            Theme::Macchiato => "macchiato",
            Theme::Mocha => "mocha",
        }
    }
}

impl Keymap {
    pub fn as_str(self) -> &'static str {
        match self {
            Keymap::Standard => "standard",
            Keymap::Vim => "vim",
        }
    }
}

/// A `user_settings` row as D1 returns it: SQLite has no booleans or arrays.
#[derive(Debug, Deserialize)]
pub struct SettingsRow {
    pub theme: Theme,
    pub editor_keymap: Keymap,
    pub editor_font_size: u32,
    pub new_per_day: u32,
    pub interview_date: Option<String>,
    /// JSON array of playlist slugs.
    pub target_companies: String,
    pub reminders: i64,
    pub public_profile: i64,
    pub daily_minutes: u32,
    pub session_minutes: u32,
    /// JSON array of windows.
    pub availability: String,
    /// JSON array of dates.
    pub days_off: String,
    pub reminder_minutes: Option<u32>,
    /// JSON object of [`Extra`].
    pub extra: String,
}

impl SettingsRow {
    pub fn into_settings(self) -> Settings {
        Settings {
            theme: self.theme,
            editor_keymap: self.editor_keymap,
            editor_font_size: self.editor_font_size,
            new_per_day: self.new_per_day,
            interview_date: self.interview_date,
            target_companies: serde_json::from_str(&self.target_companies).unwrap_or_default(),
            reminders: self.reminders != 0,
            public_profile: self.public_profile != 0,
            daily_minutes: self.daily_minutes,
            session_minutes: self.session_minutes,
            availability: serde_json::from_str(&self.availability).unwrap_or_default(),
            days_off: serde_json::from_str(&self.days_off).unwrap_or_default(),
            reminder_minutes: self.reminder_minutes,
            extra: serde_json::from_str(&self.extra).unwrap_or_default(),
        }
    }
}

/// `PATCH /api/me`. Absent fields are left alone; `display_name: null` clears it.
#[derive(Debug, Default, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct MePatch {
    pub username: Option<String>,
    #[serde(default, deserialize_with = "present")]
    pub display_name: Option<Option<String>>,
    pub settings: Option<SettingsPatch>,
}

const MAX_HEATMAP_DAYS: usize = 400;

/// Computed by the client (it owns the scheduler) and stored with progress; served
/// on the public profile only when `public_profile` is on.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PublicSummary {
    pub streak: u32,
    pub mastered: u32,
    pub solved: u32,
    /// YYYY-MM-DD to the number of problems passed that day.
    pub heatmap: BTreeMap<String, u32>,
}

impl PublicSummary {
    pub fn validate(&self) -> Result<(), String> {
        if self.heatmap.len() > MAX_HEATMAP_DAYS {
            return Err(format!("heatmap has over {MAX_HEATMAP_DAYS} days"));
        }
        if !self.heatmap.keys().all(|d| valid_date(d)) {
            return Err("heatmap keys must be YYYY-MM-DD".to_string());
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn emails() {
        assert_eq!(
            normalize_email(" Ann@Example.COM "),
            Some("ann@example.com".into())
        );
        assert_eq!(
            normalize_email("a.b+tag@sub.example.io"),
            Some("a.b+tag@sub.example.io".into())
        );
        for bad in [
            "",
            "ann",
            "@x.com",
            "ann@",
            "ann@x",
            "ann@.x.com",
            "ann@x.com.",
            "a b@x.com",
            "a@b@x.com",
            "<a>@x.com",
        ] {
            assert_eq!(normalize_email(bad), None, "{bad:?}");
        }
        assert_eq!(normalize_email(&format!("{}@x.com", "a".repeat(65))), None);
    }

    #[test]
    fn usernames() {
        for good in ["ann", "ann_lee", "a-1", "0xdead", &"a".repeat(USERNAME_MAX)] {
            assert!(validate_username(good).is_ok(), "{good:?}");
        }
        for bad in [
            "an",
            "Ann",
            "-ann",
            "_ann",
            "ann lee",
            "ann.lee",
            "admin",
            "u",
            &"a".repeat(31),
            "änn",
        ] {
            assert!(validate_username(bad).is_err(), "{bad:?}");
        }
    }

    #[test]
    fn usernames_from_hints() {
        assert_eq!(username_from_hint("OctoCat", "a1b2"), "octocat");
        assert_eq!(username_from_hint("ann.lee", "a1b2"), "ann-lee");
        assert_eq!(username_from_hint("--x..y__", "a1b2"), "x-y");
        assert_eq!(username_from_hint("jo", "a1b2"), "user-a1b2");
        assert_eq!(username_from_hint("admin", "a1b2"), "user-a1b2");
        assert_eq!(username_from_hint("李", "a1b2"), "user-a1b2");
        let long = username_from_hint(&"x".repeat(80), "a1b2");
        assert!(validate_username(&long).is_ok());
        assert!(validate_username(&with_suffix(&long, "a1b2")).is_ok());
        for hint in [
            "OctoCat",
            "ann.lee",
            "x",
            "_-_",
            "a-b-c-d-e-f-g-h-i-j-k-l-m-n-o-p",
        ] {
            let name = username_from_hint(hint, "a1b2");
            assert!(validate_username(&name).is_ok(), "{hint:?} -> {name:?}");
            assert!(validate_username(&with_suffix(&name, "a1b2")).is_ok());
        }
    }

    #[test]
    fn display_names() {
        assert_eq!(validate_display_name("  Ann Lee "), Ok("Ann Lee".into()));
        assert!(validate_display_name(&"x".repeat(61)).is_err());
        assert!(validate_display_name("a\u{0}b").is_err());
    }

    #[test]
    fn resolution() {
        assert_eq!(
            resolve(Some("u1".into()), Some("u2".into())),
            Resolution::Existing("u1".into())
        );
        assert_eq!(
            resolve(None, Some("u2".into())),
            Resolution::Link("u2".into())
        );
        assert_eq!(resolve(None, None), Resolution::Create);
    }

    fn patch(json: &str) -> SettingsPatch {
        serde_json::from_str(json).unwrap()
    }

    #[test]
    fn settings_patch_merges() {
        let base = Settings::default();
        let s = base
            .apply(patch(
                r#"{"editor_keymap":"vim","new_per_day":5,"interview_date":"2027-02-28"}"#,
            ))
            .unwrap();
        assert_eq!(s.editor_keymap, Keymap::Vim);
        assert_eq!(s.new_per_day, 5);
        assert_eq!(s.theme, Theme::System, "untouched fields keep their value");
        let cleared = s.apply(patch(r#"{"interview_date":null}"#)).unwrap();
        assert_eq!(cleared.interview_date, None);
        let kept = s.apply(patch("{}")).unwrap();
        assert_eq!(kept.interview_date.as_deref(), Some("2027-02-28"));
        let planned = s
            .apply(patch(
                r#"{"daily_minutes":90,"session_minutes":30,"reminder_minutes":null,
                    "availability":[{"days":["mon","tue"],"start":"19:00","end":"20:30"}],
                    "days_off":["2027-01-01"],"target_companies":["salesforce_slack"]}"#,
            ))
            .unwrap();
        assert_eq!(
            (planned.daily_minutes, planned.reminder_minutes),
            (90, None)
        );
        assert_eq!(planned.availability.len(), 1);
        assert_eq!(s.reminder_minutes, Some(15), "default lead time");
        // The client passes these settings straight to the planner.
        let p: myleet_core::planner::Settings =
            serde_json::from_value(serde_json::to_value(&planned).unwrap()).unwrap();
        assert_eq!(
            (p.daily_minutes, p.session_minutes, p.new_per_day),
            (90, 30, 5)
        );
    }

    #[test]
    fn settings_patch_validates() {
        let base = Settings::default();
        for bad in [
            r#"{"new_per_day":21}"#,
            r#"{"editor_font_size":4}"#,
            r#"{"interview_date":"2027-02-30"}"#,
            r#"{"target_companies":["Google"]}"#,
            r#"{"daily_minutes":5}"#,
            r#"{"session_minutes":500}"#,
            r#"{"reminder_minutes":2000}"#,
            r#"{"days_off":["2027-02-30"]}"#,
            r#"{"availability":[{"days":["mon"],"start":"20:00","end":"19:00"}]}"#,
            r#"{"availability":[{"days":["funday"],"start":"19:00","end":"20:00"}]}"#,
        ] {
            assert!(base.apply(patch(bad)).is_err(), "{bad}");
        }
        assert!(serde_json::from_str::<SettingsPatch>(r#"{"theme":"neon"}"#).is_err());
        assert!(serde_json::from_str::<SettingsPatch>(r#"{"unknown":1}"#).is_err());
    }

    #[test]
    fn settings_row_maps() {
        let row: SettingsRow = serde_json::from_str(
            r#"{"theme":"dark","editor_keymap":"vim","editor_font_size":16,"new_per_day":2,
                "interview_date":null,"target_companies":"[\"google\"]","reminders":1,"public_profile":0,
                "daily_minutes":90,"session_minutes":30,
                "availability":"[{\"days\":[\"sat\"],\"start\":\"10:00\",\"end\":\"12:00\"}]",
                "days_off":"[]","reminder_minutes":null,
                "extra":"{\"accent\":\"teal\",\"weekend_minutes\":null,\"moves\":[]}"}"#,
        )
        .unwrap();
        let s = row.into_settings();
        assert_eq!(s.theme.as_str(), "mocha", "legacy dark reads as mocha");
        assert_eq!(s.extra.accent, Accent::Teal);
        assert_eq!(s.extra.night_flavor, NightFlavor::Mocha);
        assert_eq!(s.extra.weekend_minutes, Some(None));
        assert_eq!(s.extra.moves, Some(Vec::new()));
        assert_eq!(s.extra.day_minutes, None);
        assert_eq!(s.editor_keymap.as_str(), "vim");
        assert_eq!(s.target_companies, vec!["google".to_string()]);
        assert!(s.reminders && !s.public_profile);
        assert_eq!(
            (s.daily_minutes, s.session_minutes, s.reminder_minutes),
            (90, 30, None)
        );
        assert_eq!(s.availability[0].days, vec!["sat".to_string()]);
    }

    #[test]
    fn themes() {
        let t = |j: &str| serde_json::from_str::<Theme>(j).unwrap();
        assert_eq!(t(r#""light""#), Theme::Latte);
        assert_eq!(t(r#""dark""#), Theme::Mocha);
        for name in ["system", "latte", "frappe", "macchiato", "mocha"] {
            assert_eq!(t(&format!("\"{name}\"")).as_str(), name);
        }
        let base = Settings::default();
        let s = base
            .apply(patch(
                r#"{"theme":"frappe","night_flavor":"macchiato","accent":"lavender"}"#,
            ))
            .unwrap();
        assert_eq!(
            (s.theme, s.extra.night_flavor, s.extra.accent),
            (Theme::Frappe, NightFlavor::Macchiato, Accent::Lavender)
        );
        for bad in [
            r#"{"night_flavor":"latte"}"#,
            r#"{"accent":"purple"}"#,
            r#"{"theme":"neon"}"#,
        ] {
            assert!(serde_json::from_str::<SettingsPatch>(bad).is_err(), "{bad}");
        }
        let v = serde_json::to_value(&base).unwrap();
        assert_eq!(
            (v["night_flavor"].as_str(), v["accent"].as_str()),
            (Some("mocha"), Some("mauve"))
        );
    }

    #[test]
    fn extra_settings_merge_and_round_trip() {
        let base = Settings::default();
        let fresh = serde_json::to_value(&base).unwrap();
        assert!(
            fresh.get("weekend_minutes").is_none() && fresh.get("moves").is_none(),
            "unset fields are absent so a device keeps its own value"
        );
        let s = base
            .apply(patch(
                r#"{"weekend_minutes":120,"day_minutes":{"2026-11-16":30},
                    "moves":[{"from":"2026-11-17","from_start":"19:00","to":"2026-11-19","to_start":"07:00","minutes":60}],
                    "reminder_time":"19:00","reminder_lead":10,"quiet_from":"23:00","quiet_to":"08:00",
                    "time_targets":{"easy":15,"medium":25,"hard":40},"reduce_motion":true,
                    "editor_ligatures":false,"editor_minimap":true,"editor_indent":2,
                    "editor_format_on_save":false,"editor_run_on_save":true,
                    "goal":"coop","plan_started_at":"2026-11-01","onboarded":true,
                    "interviews":[{"date":"2026-12-15","company":"meta"},{"date":"2027-01-10","company":null}]}"#,
            ))
            .unwrap();
        assert_eq!(s.extra.weekend_minutes, Some(Some(120)));
        assert_eq!(s.extra.goal, Some(Some(Goal::Coop)));
        let cleared = s
            .apply(patch(r#"{"weekend_minutes":null,"goal":null}"#))
            .unwrap();
        assert_eq!(
            (cleared.extra.weekend_minutes, cleared.extra.goal),
            (Some(None), Some(None))
        );
        assert_eq!(cleared.extra.moves, s.extra.moves, "untouched fields kept");
        // Stored as the `extra` column and read back unchanged.
        let stored = serde_json::to_string(&s.extra).unwrap();
        assert_eq!(serde_json::from_str::<Extra>(&stored).unwrap(), s.extra);
        // The planner reads the flattened settings as they are.
        let p: myleet_core::planner::Settings =
            serde_json::from_value(serde_json::to_value(&s).unwrap()).unwrap();
        assert_eq!(p.weekend_minutes, Some(120));
        assert_eq!(p.day_minutes.get("2026-11-16"), Some(&30));
        assert_eq!(p.moves.len(), 1);
        assert_eq!(p.interviews.len(), 2);
        assert_eq!(p.interviews[0].company.as_deref(), Some("meta"));
    }

    #[test]
    fn extra_settings_validate() {
        let base = Settings::default();
        let mv = |from_start: &str, minutes: u32| {
            format!(
                r#"{{"moves":[{{"from":"2026-11-17","from_start":"{from_start}","to":"2026-11-19","to_start":"07:00","minutes":{minutes}}}]}}"#
            )
        };
        let many_days: BTreeMap<String, u32> = (0..=MAX_DAY_BUDGETS)
            .map(|i| (format!("2027-{:02}-{:02}", i / 28 + 1, i % 28 + 1), 30))
            .collect();
        let many_moves = format!(
            r#"{{"moves":[{}]}}"#,
            vec![r#"{"from":"2026-11-17","from_start":"19:00","to":"2026-11-19","to_start":"07:00","minutes":60}"#; MAX_MOVES + 1].join(",")
        );
        for bad in [
            r#"{"weekend_minutes":5}"#.to_string(),
            r#"{"day_minutes":{"2026-02-30":30}}"#.to_string(),
            r#"{"day_minutes":{"2026-11-16":601}}"#.to_string(),
            serde_json::json!({ "day_minutes": many_days }).to_string(),
            mv("25:00", 60),
            mv("19:00", 0),
            many_moves,
            r#"{"reminder_time":"7pm"}"#.to_string(),
            r#"{"quiet_to":"24:00"}"#.to_string(),
            r#"{"reminder_lead":2000}"#.to_string(),
            r#"{"time_targets":{"easy":0,"medium":25,"hard":40}}"#.to_string(),
            r#"{"editor_indent":3}"#.to_string(),
            r#"{"plan_started_at":"soon"}"#.to_string(),
            r#"{"interviews":[{"date":"2026-13-01"}]}"#.to_string(),
            r#"{"interviews":[{"date":"2026-12-01","company":"Meta Inc"}]}"#.to_string(),
        ] {
            assert!(base.apply(patch(&bad)).is_err(), "{bad}");
        }
        for bad in [
            r#"{"goal":"phd"}"#,
            r#"{"time_targets":{"easy":1,"medium":2}}"#,
            r#"{"moves":[{"from":"2026-11-17"}]}"#,
        ] {
            assert!(serde_json::from_str::<SettingsPatch>(bad).is_err(), "{bad}");
        }
        assert!(base.apply(patch(&mv("19:00", 45))).is_ok());
    }

    #[test]
    fn me_patch_parses() {
        let p: MePatch =
            serde_json::from_str(r#"{"display_name":null,"settings":{"theme":"light"}}"#).unwrap();
        assert_eq!(p.display_name, Some(None));
        assert!(p.username.is_none());
        assert!(serde_json::from_str::<MePatch>(r#"{"email":"x@y.z"}"#).is_err());
    }

    #[test]
    fn dates() {
        assert!(valid_date("2028-02-29"));
        assert!(!valid_date("2027-02-29"));
        assert!(!valid_date("2027-13-01"));
        assert!(!valid_date("2027-1-01"));
        assert!(!valid_date("2027-01-0a"));
        assert!(!valid_date("+027-01-01"));
    }

    #[test]
    fn public_summary() {
        let ok: PublicSummary = serde_json::from_str(
            r#"{"streak":3,"mastered":10,"solved":42,"heatmap":{"2026-11-14":2}}"#,
        )
        .unwrap();
        assert!(ok.validate().is_ok());
        let bad = PublicSummary {
            heatmap: BTreeMap::from([("yesterday".to_string(), 1)]),
            ..ok
        };
        assert!(bad.validate().is_err());
    }
}
