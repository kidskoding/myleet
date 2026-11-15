//! Loads the catalog from the content directory; the model lives in `myleet_core::catalog`.

mod load;
mod lock;
mod root;

pub use load::{LoadError, load, note_title};
pub use lock::{LOCK_FILE, read_lock, write_lock};
pub use myleet_core::catalog::*;
pub use root::{
    CONTENT_DIR_NAME, DEFAULT_REPO, bootstrap_content, content_dir, ensure_root, ensure_root_with,
    find_root, find_root_with, root_kind, root_kind_with, sync_deps, update_content,
};

#[cfg(test)]
pub(crate) fn testdata(name: &str) -> std::path::PathBuf {
    std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("src/testdata/catalog")
        .join(name)
}
