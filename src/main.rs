mod version;

use std::io::Write;
use std::process::ExitCode;

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().skip(1).collect();
    ExitCode::from(run(&args, &mut std::io::stdout(), &mut std::io::stderr()))
}

fn run(args: &[String], stdout: &mut impl Write, stderr: &mut impl Write) -> u8 {
    let cmd = args.first().map_or("", String::as_str);
    match cmd {
        "version" | "-v" | "--version" => {
            let _ = writeln!(stdout, "{}", version::string());
            0
        }
        _ => {
            let what = if cmd.is_empty() { "the trainer" } else { cmd };
            let _ = writeln!(stderr, "myleet-rs: {what:?} is not ported yet; use myleet");
            2
        }
    }
}

#[cfg(test)]
mod tests {
    use super::run;

    fn call(args: &[&str]) -> (u8, String, String) {
        let args: Vec<String> = args.iter().map(|a| a.to_string()).collect();
        let (mut out, mut err) = (Vec::new(), Vec::new());
        let code = run(&args, &mut out, &mut err);
        (
            code,
            String::from_utf8(out).unwrap(),
            String::from_utf8(err).unwrap(),
        )
    }

    #[test]
    fn version_prints_identity() {
        for flag in ["version", "-v", "--version"] {
            let (code, out, _) = call(&[flag]);
            assert_eq!(code, 0, "{flag}");
            assert!(out.starts_with("myleet "), "{flag}: {out}");
        }
    }

    #[test]
    fn unported_commands_exit_2() {
        for args in [&["validate"][..], &[][..]] {
            let (code, _, err) = call(args);
            assert_eq!(code, 2, "{args:?}");
            assert!(err.contains("not ported yet"), "{args:?}: {err}");
        }
    }
}
