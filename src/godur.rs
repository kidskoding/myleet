use std::time::Duration;

// shortcut: no sign support (Go allows "-1s"); targets and timeouts are never negative.
pub fn parse(s: &str) -> Result<Duration, String> {
    let bad = || format!("time: invalid duration {s:?}");
    if s == "0" {
        return Ok(Duration::ZERO);
    }
    let mut rest = s;
    let mut total = 0.0;
    if rest.is_empty() {
        return Err(bad());
    }
    while !rest.is_empty() {
        let num_len = rest
            .find(|c: char| !(c.is_ascii_digit() || c == '.'))
            .unwrap_or(rest.len());
        let num = &rest[..num_len];
        if num.is_empty() || num == "." || num.matches('.').count() > 1 {
            return Err(bad());
        }
        let value: f64 = num
            .parse()
            .or_else(|_| format!("{num}0").parse())
            .map_err(|_| bad())?;
        rest = &rest[num_len..];
        let unit_len = rest
            .find(|c: char| c.is_ascii_digit() || c == '.')
            .unwrap_or(rest.len());
        let scale = match &rest[..unit_len] {
            "ns" => 1e-9,
            "us" | "µs" => 1e-6,
            "ms" => 1e-3,
            "s" => 1.0,
            "m" => 60.0,
            "h" => 3600.0,
            "" => return Err(format!("time: missing unit in duration {s:?}")),
            unit => return Err(format!("time: unknown unit {unit:?} in duration {s:?}")),
        };
        total += value * scale;
        rest = &rest[unit_len..];
    }
    Ok(Duration::from_secs_f64(total))
}

/// Go's `d.Round(time.Second).String()`: `45s`, `4m12s`, `1h0m0s`.
pub fn format_secs(d: jiff::SignedDuration) -> String {
    let ms = d.as_millis();
    let secs = (ms.abs() + 500) / 1000;
    let sign = if ms < 0 && secs > 0 { "-" } else { "" };
    let (h, m, s) = (secs / 3600, secs / 60 % 60, secs % 60);
    match (h, m) {
        (0, 0) => format!("{sign}{s}s"),
        (0, _) => format!("{sign}{m}m{s}s"),
        _ => format!("{sign}{h}h{m}m{s}s"),
    }
}

#[cfg(test)]
mod tests {
    use super::{format_secs, parse};
    use std::time::Duration;

    #[test]
    fn parses_go_durations() {
        let cases = [
            ("20m", 1200.0),
            ("10s", 10.0),
            ("1h30m", 5400.0),
            ("1.5h", 5400.0),
            ("500ms", 0.5),
            ("0", 0.0),
            ("2m0.5s", 120.5),
            ("1.h", 3600.0),
        ];
        for (s, secs) in cases {
            assert_eq!(parse(s), Ok(Duration::from_secs_f64(secs)), "{s}");
        }
    }

    #[test]
    fn formats_like_go() {
        use jiff::SignedDuration as D;
        let cases = [
            (D::ZERO, "0s"),
            (D::from_secs(45), "45s"),
            (D::from_secs(252), "4m12s"),
            (D::from_secs(60), "1m0s"),
            (D::from_secs(3600), "1h0m0s"),
            (D::from_millis(1500), "2s"),
            (D::from_millis(1499), "1s"),
            (D::from_secs(-90), "-1m30s"),
        ];
        for (d, want) in cases {
            assert_eq!(format_secs(d), want, "{d:?}");
        }
    }

    #[test]
    fn rejects_bad_durations() {
        for s in ["", "20 minutes", "20", "m", ".h", "5d", "-1s", "1..5s"] {
            assert!(parse(s).is_err(), "{s} should fail");
        }
    }
}
