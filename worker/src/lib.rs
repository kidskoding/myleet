//! The myleet backend: accounts (GitHub, Google, email magic links), LeetCode
//! statements and progress sync. Only `api` touches the Workers runtime; the rest is
//! plain Rust tested natively.

pub mod account;
pub mod calendar;
pub mod leetcode;
pub mod magic;
pub mod oauth;
pub mod reports;
pub mod session;
pub mod statement;
pub mod sync;

#[cfg(target_arch = "wasm32")]
mod api;
