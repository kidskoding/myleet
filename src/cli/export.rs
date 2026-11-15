use std::io::Write;

use super::{Term, Tone};
use crate::app::Env;
use crate::{catalog, export};

pub fn run<O: Write, E: Write>(
    args: &[String],
    out: &mut Term<O>,
    err: &mut Term<E>,
    env: &Env,
) -> u8 {
    let [dir] = args else {
        err.line("usage: myleet export <dir>");
        return 2;
    };
    let root = match env.ensure_root(&mut err.w) {
        Ok(root) => root,
        Err(e) => {
            err.line(&format!("myleet: {e}"));
            return 1;
        }
    };
    let c = match catalog::load(&root) {
        Ok(c) => c,
        Err(e) => {
            err.line(&err.paint(Tone::Fail, &e.to_string()));
            return 1;
        }
    };
    let dir = env.cwd.join(dir);
    match export::export(&c, &dir) {
        Ok(s) => {
            out.line(&format!(
                "{} exported {} problems, {} notes, {} lib files to {}",
                out.paint(Tone::Pass, "ok:"),
                s.problems,
                s.notes,
                s.lib,
                dir.display()
            ));
            0
        }
        Err(e) => {
            err.line(&format!("myleet: export: {e}"));
            1
        }
    }
}
