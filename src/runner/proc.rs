use std::process::{Child, Command};

/// Puts pytest in its own process group so a timeout kills its children too.
#[cfg(unix)]
pub(super) fn own_group(cmd: &mut Command) {
    use std::os::unix::process::CommandExt;
    cmd.process_group(0);
}

#[cfg(unix)]
pub(super) fn kill_group(child: &mut Child) {
    match libc::pid_t::try_from(child.id()) {
        // SAFETY: kill takes plain integers; a negative pid targets the group made by own_group.
        Ok(pid) => unsafe {
            libc::kill(-pid, libc::SIGKILL);
        },
        Err(_) => {
            let _ = child.kill();
        }
    }
}

#[cfg(not(unix))]
pub(super) fn own_group(_cmd: &mut Command) {}

/// Windows kills only pytest itself.
#[cfg(not(unix))]
pub(super) fn kill_group(child: &mut Child) {
    let _ = child.kill();
}
