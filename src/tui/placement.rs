//! Stub carrying the placement port's contract type until that port merges.

/// Sent by an exam-mode Focus after `opened`, each finished run and each hint,
/// so the parent screen can record the attempt's outcome itself.
pub struct FocusStatus {
    pub problem_id: String,
    pub attempt: String,
    pub green: bool,
    pub hints: u32,
}
