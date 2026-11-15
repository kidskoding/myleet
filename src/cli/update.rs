use std::io::Write;

use super::Term;
use crate::app::Env;
use crate::catalog;

pub fn run<O: Write, E: Write>(out: &mut Term<O>, err: &mut Term<E>, env: &Env) -> u8 {
    let root = match env.ensure_root(&mut err.w) {
        Ok(root) => root,
        Err(e) => {
            err.line(&format!("myleet: {e}"));
            return 1;
        }
    };
    let kind = catalog::root_kind_with(&root, &env.data_dir(), env.get("MYLEET_ROOT"));
    if kind != "installed content" {
        out.line(&format!("curriculum is a {kind} at {}", root.display()));
        out.line("pull updates yourself with git, or unset MYLEET_ROOT to use the installed copy.");
        return 0;
    }
    out.line(&format!("updating {} …", root.display()));
    let synced =
        catalog::update_content(&root).and_then(|()| catalog::sync_deps(&root, &mut err.w));
    if let Err(e) = synced {
        err.line(&format!("myleet: {e}"));
        return 1;
    }
    out.line("curriculum up to date.");
    0
}

#[cfg(test)]
mod tests {
    use crate::app::testenv::TestEnv;
    use crate::cli::call;

    #[test]
    fn update_leaves_a_checkout_alone() {
        let e = TestEnv::new("good");
        let (code, out) = call(&e, &["update"]);
        assert_eq!(code, 0, "{out}");
        assert!(out.contains("curriculum is a MYLEET_ROOT at"), "{out}");
    }
}
