use std::collections::BTreeMap;
use std::io::{BufRead, BufReader, Read, Write};
use std::net::TcpListener;
use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};

use jiff::tz::TimeZone;
use jiff::{SignedDuration, Timestamp};

use crate::catalog::{self, Catalog};
use crate::progress::Event;
use crate::schedule::{Attempt, Outcome};

pub fn chicago() -> TimeZone {
    TimeZone::get("America/Chicago").unwrap()
}

pub fn good_catalog() -> Catalog {
    catalog::load(&catalog::testdata("good")).unwrap_or_else(|e| panic!("{e:?}"))
}

fn chicago_at(day: i8, hour: i8) -> Timestamp {
    jiff::civil::date(2026, 10, day)
        .at(hour, 0, 0, 0)
        .to_zoned(chicago())
        .unwrap()
        .timestamp()
}

pub fn day(day: i8) -> Timestamp {
    chicago_at(day, 12)
}

pub fn midnight(day: i8) -> Timestamp {
    chicago_at(day, 0)
}

pub fn attempt(problem: &str, outcome: Outcome) -> Attempt {
    Attempt {
        id: String::new(),
        problem: problem.into(),
        start: Timestamp::UNIX_EPOCH,
        end: None,
        outcome,
        clean: false,
        elapsed: SignedDuration::ZERO,
        hints: 0,
        peeks: 0,
        restarts: 0,
        mode: String::new(),
    }
}

pub fn event(time: Timestamp, kind: &str, mode: &str, data: BTreeMap<String, String>) -> Event {
    Event {
        time,
        kind: kind.into(),
        problem: String::new(),
        attempt: String::new(),
        mode: mode.into(),
        data,
    }
}

/// A one-request-per-connection HTTP server; `reply` maps a request body to a
/// response body. Returns its URL.
pub fn serve(calls: Arc<AtomicUsize>, reply: fn(&str) -> String) -> String {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let url = format!("http://{}/graphql", listener.local_addr().unwrap());
    std::thread::spawn(move || {
        for stream in listener.incoming() {
            let Ok(mut stream) = stream else { continue };
            calls.fetch_add(1, Ordering::SeqCst);
            let mut reader = BufReader::new(&stream);
            let mut length = 0;
            loop {
                let mut line = String::new();
                if reader.read_line(&mut line).unwrap_or(0) == 0 || line == "\r\n" {
                    break;
                }
                let lower = line.to_ascii_lowercase();
                if let Some(v) = lower.strip_prefix("content-length:") {
                    length = v.trim().parse().unwrap_or(0);
                }
            }
            let mut body = vec![0; length];
            let _ = reader.read_exact(&mut body);
            let out = reply(&String::from_utf8_lossy(&body));
            let _ = write!(
                stream,
                "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{out}",
                out.len()
            );
        }
    });
    url
}
