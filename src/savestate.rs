//! The save file on disk; parsing and rendering live in `myleet_core::savestate`.

use std::collections::HashMap;
use std::io::Write as _;
use std::path::Path;

use jiff::tz::TimeZone;

use crate::catalog::Catalog;
use crate::schedule::State;

pub use myleet_core::savestate::*;

pub fn read(path: &Path, tz: &TimeZone) -> Result<HashMap<String, State>, ReadError> {
    let text = std::fs::read_to_string(path).map_err(|e| match e.kind() {
        std::io::ErrorKind::NotFound => ReadError::Missing,
        _ => ReadError::Io(e),
    })?;
    parse(&text, &path.display().to_string(), tz)
}

/// Keeps ids missing from the catalog (written last) so hand edits are never lost.
pub fn write(
    path: &Path,
    c: &Catalog,
    states: &HashMap<String, State>,
    tz: &TimeZone,
) -> std::io::Result<()> {
    write_atomic(path, &render(c, states, tz))
}

fn write_atomic(path: &Path, content: &str) -> std::io::Result<()> {
    let dir = path.parent().unwrap_or(Path::new("."));
    std::fs::create_dir_all(dir)?;
    let mut tmp = tempfile::Builder::new()
        .prefix(".progress-")
        .tempfile_in(dir)?;
    tmp.write_all(content.as_bytes())?;
    tmp.persist(path).map_err(|e| e.error)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::catalog::{load, testdata};

    fn chicago() -> TimeZone {
        TimeZone::get("America/Chicago").unwrap()
    }

    #[test]
    fn missing_file_is_distinct() {
        let dir = tempfile::tempdir().unwrap();
        assert!(matches!(
            read(&dir.path().join("nope.toml"), &chicago()),
            Err(ReadError::Missing)
        ));
    }

    #[test]
    fn file_round_trip_names_the_path() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("sub/progress.toml");
        let c = load(&testdata("good")).unwrap();
        let compat =
            Path::new(env!("CARGO_MANIFEST_DIR")).join("src/testdata/compat/progress.toml");
        let states = read(&compat, &chicago()).unwrap();
        write(&path, &c, &states, &chicago()).unwrap();
        assert_eq!(read(&path, &chicago()).unwrap(), states);
        std::fs::write(&path, "[x]\nrung = oops\n").unwrap();
        let err = read(&path, &chicago()).unwrap_err().to_string();
        assert!(
            err.starts_with(&format!("{} line 2", path.display())),
            "{err}"
        );
    }
}
