use std::ffi::OsString;
use std::path::Path;
use std::sync::mpsc::{self, Receiver, RecvTimeoutError, TrySendError};
use std::time::{Duration, Instant};

use notify::event::ModifyKind;
use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};

/// A running watch. `events` gets one `()` per debounced burst of saves; dropping the
/// handle stops the watch and then disconnects `events`.
pub struct FileWatch {
    pub events: Receiver<()>,
    _watcher: RecommendedWatcher,
}

/// Watches the parent directory because many editors save by renaming a temp file over
/// the original, which replaces the watched inode.
pub fn file(path: &Path, debounce: Duration) -> notify::Result<FileWatch> {
    let dir = match path.parent() {
        Some(d) if !d.as_os_str().is_empty() => d,
        _ => Path::new("."),
    };
    let name: OsString = path.file_name().unwrap_or_default().to_owned();
    let (raw_tx, raw_rx) = mpsc::channel::<notify::Result<Event>>();
    let mut watcher = notify::recommended_watcher(move |ev| {
        let _ = raw_tx.send(ev);
    })?;
    watcher.watch(dir, RecursiveMode::NonRecursive)?;
    // Capacity 1 with try_send: at most one signal waits, like Go's buffered channel.
    let (tx, rx) = mpsc::sync_channel(1);
    std::thread::spawn(move || {
        let mut fire_at: Option<Instant> = None;
        loop {
            let got = match fire_at {
                None => raw_rx.recv().map_err(|_| RecvTimeoutError::Disconnected),
                Some(at) => raw_rx.recv_timeout(at.saturating_duration_since(Instant::now())),
            };
            match got {
                Ok(Ok(ev)) if relevant(&ev, &name) => fire_at = Some(Instant::now() + debounce),
                Ok(_) => {}
                Err(RecvTimeoutError::Timeout) => {
                    fire_at = None;
                    if let Err(TrySendError::Disconnected(())) = tx.try_send(()) {
                        return;
                    }
                }
                Err(RecvTimeoutError::Disconnected) => return,
            }
        }
    });
    Ok(FileWatch {
        events: rx,
        _watcher: watcher,
    })
}

impl FileWatch {
    /// Splits the handle so a thread can block on `events`; the watch runs until the
    /// returned watcher is dropped.
    pub fn into_parts(self) -> (Receiver<()>, RecommendedWatcher) {
        (self.events, self._watcher)
    }
}

fn relevant(ev: &Event, name: &OsString) -> bool {
    let kind_ok = match ev.kind {
        EventKind::Create(_) => true,
        EventKind::Modify(ModifyKind::Metadata(_)) => false,
        EventKind::Modify(_) => true,
        _ => false,
    };
    kind_ok
        && ev
            .paths
            .iter()
            .any(|p| p.file_name().is_some_and(|n| n == name.as_os_str()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;

    fn start() -> (PathBuf, FileWatch, tempfile::TempDir) {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("attempt.py");
        fs::write(&path, "v0\n").unwrap();
        let w = file(&path, Duration::from_millis(150)).unwrap();
        (path, w, dir)
    }

    fn count(w: &FileWatch, within: Duration) -> usize {
        let deadline = Instant::now() + within;
        let mut n = 0;
        while let Some(left) = deadline.checked_duration_since(Instant::now()) {
            match w.events.recv_timeout(left) {
                Ok(()) => n += 1,
                Err(_) => break,
            }
        }
        n
    }

    #[test]
    fn watch_write() {
        let (path, w, _d) = start();
        fs::write(&path, "v1\n").unwrap();
        assert_eq!(count(&w, Duration::from_secs(1)), 1);
    }

    #[test]
    fn watch_burst_coalesced() {
        let (path, w, _d) = start();
        for i in 0..5u8 {
            fs::write(&path, [b'a' + i, b'\n']).unwrap();
            std::thread::sleep(Duration::from_millis(10));
        }
        assert_eq!(count(&w, Duration::from_secs(1)), 1);
    }

    #[test]
    fn watch_rename_save() {
        let (path, w, _d) = start();
        let tmp = path.with_extension("py.tmp");
        fs::write(&tmp, "renamed\n").unwrap();
        fs::rename(&tmp, &path).unwrap();
        assert_eq!(count(&w, Duration::from_secs(1)), 1);
    }

    #[test]
    fn watch_ignores_other_files() {
        let (path, w, _d) = start();
        fs::write(path.with_file_name("other.py"), "x\n").unwrap();
        assert_eq!(count(&w, Duration::from_millis(500)), 0);
    }
}
