pub fn string() -> String {
    identity(
        option_env!("MYLEET_VERSION").unwrap_or("dev"),
        option_env!("MYLEET_COMMIT").unwrap_or("none"),
        option_env!("MYLEET_DATE").unwrap_or("unknown"),
    )
}

fn identity(version: &str, commit: &str, date: &str) -> String {
    if version == "dev" && commit == "none" {
        return "myleet (dev)".to_string();
    }
    format!("myleet {version} ({commit}, {date})")
}

#[cfg(test)]
mod tests {
    use super::identity;

    #[test]
    fn full_identity() {
        assert_eq!(
            identity("0.1.0", "abc123", "2026-11-14"),
            "myleet 0.1.0 (abc123, 2026-11-14)"
        );
    }

    #[test]
    fn local_build_falls_back_like_go() {
        assert_eq!(identity("dev", "none", "unknown"), "myleet (dev)");
    }
}
