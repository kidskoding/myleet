//! Accounts: email and username rules, settings, sign-in resolution and the
//! opt-in public summary.

use std::collections::BTreeMap;

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

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    System,
    Light,
    Dark,
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
}

impl Settings {
    pub fn apply(&self, patch: SettingsPatch) -> Result<Settings, String> {
        let mut s = self.clone();
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
        Ok(s)
    }
}

fn valid_slug(s: &str, max: usize) -> bool {
    !s.is_empty()
        && s.len() <= max
        && s.bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
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
            Theme::Light => "light",
            Theme::Dark => "dark",
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
    }

    #[test]
    fn settings_patch_validates() {
        let base = Settings::default();
        for bad in [
            r#"{"new_per_day":21}"#,
            r#"{"editor_font_size":4}"#,
            r#"{"interview_date":"2027-02-30"}"#,
            r#"{"target_companies":["Google"]}"#,
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
                "interview_date":null,"target_companies":"[\"google\"]","reminders":1,"public_profile":0}"#,
        )
        .unwrap();
        let s = row.into_settings();
        assert_eq!(s.theme.as_str(), "dark");
        assert_eq!(s.editor_keymap.as_str(), "vim");
        assert_eq!(s.target_companies, vec!["google".to_string()]);
        assert!(s.reminders && !s.public_profile);
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
