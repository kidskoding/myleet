//! Pure logic shared by the CLI and the browser build: no filesystem, processes or
//! network, so it compiles for `wasm32-unknown-unknown`.

pub mod catalog;
pub mod checkpoint;
pub mod godur;
pub mod habits;
pub mod ical;
pub mod interview;
pub mod placement;
pub mod planner;
pub mod progress;
pub mod savestate;
pub mod schedule;
pub mod session;
pub mod skills;
pub mod stats;

#[cfg(test)]
mod testutil;
