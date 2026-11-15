use std::io::IsTerminal;
use std::process::ExitCode;

use myleet::cli::{self, Term};

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let no_color = std::env::var_os("NO_COLOR").is_some_and(|v| !v.is_empty());
    let mut out = Term::new(
        std::io::stdout(),
        !no_color && std::io::stdout().is_terminal(),
    );
    let mut err = Term::new(
        std::io::stderr(),
        !no_color && std::io::stderr().is_terminal(),
    );
    ExitCode::from(cli::run(&args, &mut out, &mut err))
}
