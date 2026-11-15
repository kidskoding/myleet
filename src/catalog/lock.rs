use std::fs;
use std::io::ErrorKind;
use std::path::Path;

/// Saved progress is keyed by id, so an id that vanishes from the catalog would orphan
/// it; validate fails until the lock agrees.
pub const LOCK_FILE: &str = "problem-ids.lock";

/// `None` when there is no lock file; an empty file is a lock with no ids.
pub fn read_lock(root: &Path) -> std::io::Result<Option<Vec<String>>> {
    match fs::read_to_string(root.join(LOCK_FILE)) {
        Ok(text) => Ok(Some(text.split_whitespace().map(String::from).collect())),
        Err(e) if e.kind() == ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e),
    }
}

pub fn write_lock(root: &Path, ids: &[String]) -> std::io::Result<()> {
    fs::write(root.join(LOCK_FILE), ids.join("\n") + "\n")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn missing_empty_and_round_trip() {
        let dir = tempfile::tempdir().unwrap();
        assert_eq!(read_lock(dir.path()).unwrap(), None);
        fs::write(dir.path().join(LOCK_FILE), "").unwrap();
        assert_eq!(read_lock(dir.path()).unwrap(), Some(vec![]));
        let ids = vec!["a".to_string(), "b".to_string()];
        write_lock(dir.path(), &ids).unwrap();
        assert_eq!(
            fs::read_to_string(dir.path().join(LOCK_FILE)).unwrap(),
            "a\nb\n"
        );
        assert_eq!(read_lock(dir.path()).unwrap(), Some(ids));
    }
}
