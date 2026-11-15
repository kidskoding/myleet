mod validate;

use std::io::Write;

use crate::version;

/// A writer plus whether it may print colors (a terminal with `NO_COLOR` unset).
pub struct Term<W: Write> {
    pub w: W,
    pub color: bool,
}

#[derive(Clone, Copy)]
pub enum Tone {
    Pass,
    Fail,
    Due,
}

impl<W: Write> Term<W> {
    pub fn new(w: W, color: bool) -> Self {
        Term { w, color }
    }

    pub fn paint(&self, tone: Tone, text: &str) -> String {
        if !self.color {
            return text.to_string();
        }
        let code = match tone {
            Tone::Pass => 32,
            Tone::Fail => 31,
            Tone::Due => 33,
        };
        format!("\x1b[{code}m{text}\x1b[0m")
    }

    pub fn line(&mut self, text: &str) {
        let _ = writeln!(self.w, "{text}");
    }
}

pub fn run<O: Write, E: Write>(args: &[String], out: &mut Term<O>, err: &mut Term<E>) -> u8 {
    let (cmd, rest) = args
        .split_first()
        .map_or(("", &[][..]), |(c, r)| (c.as_str(), r));
    match cmd {
        "version" | "-v" | "--version" => {
            out.line(&version::string());
            0
        }
        "validate" => validate::run(rest, out, err),
        _ => {
            let what = if cmd.is_empty() { "the trainer" } else { cmd };
            err.line(&format!(
                "myleet-rs: {what:?} is not ported yet; use myleet"
            ));
            2
        }
    }
}

#[cfg(test)]
pub(crate) fn call(args: &[&str]) -> (u8, String) {
    let args: Vec<String> = args.iter().map(|a| a.to_string()).collect();
    let mut out = Term::new(Vec::new(), false);
    let mut err = Term::new(Vec::new(), false);
    let code = run(&args, &mut out, &mut err);
    let mut text = String::from_utf8(out.w).unwrap();
    text.push_str(&String::from_utf8(err.w).unwrap());
    (code, text)
}

#[cfg(test)]
mod tests {
    use super::{Term, Tone, call};

    #[test]
    fn version_prints_identity() {
        for flag in ["version", "-v", "--version"] {
            let (code, out) = call(&[flag]);
            assert_eq!(code, 0, "{flag}");
            assert!(out.starts_with("myleet "), "{flag}: {out}");
        }
    }

    #[test]
    fn unported_commands_exit_2() {
        for args in [&["doctor"][..], &[][..]] {
            let (code, out) = call(args);
            assert_eq!(code, 2, "{args:?}");
            assert!(out.contains("not ported yet"), "{args:?}: {out}");
        }
    }

    #[test]
    fn colors_only_when_allowed() {
        assert_eq!(Term::new(Vec::new(), false).paint(Tone::Pass, "ok:"), "ok:");
        assert_eq!(
            Term::new(Vec::new(), true).paint(Tone::Pass, "ok:"),
            "\x1b[32mok:\x1b[0m"
        );
    }
}
