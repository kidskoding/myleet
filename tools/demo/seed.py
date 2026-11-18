"""The local demo learner for `just dev`: about four weeks of made-up practice ending
yesterday, a Google interview in 19 days, a Meta one after it, and evening practice
hours. Writes SQL for the local D1 database; `GET /api/auth/demo` signs in as it.

Usage: python tools/demo/seed.py <catalog.json> <out.sql>
"""

import datetime as dt
import json
import random
import sys
from pathlib import Path
from typing import Any

USER_ID = "demo"
EMAIL = "demo@myleet.test"  # worker/src/magic.rs DEMO_EMAIL
NOW = dt.datetime.now().astimezone()
TODAY = NOW.date()


def technique(catalog: dict[str, Any], module_word: str, technique_word: str) -> list[dict[str, Any]]:
    """The problems of the first technique whose module and title contain these words."""
    for m in catalog["modules"]:
        if module_word in m["title"].lower():
            for t in m["techniques"]:
                if technique_word in t["title"].lower():
                    return [catalog["problems"][i] for i in t["problems"]]
    raise SystemExit(f"no technique matching {module_word}/{technique_word}")


def events(catalog: dict[str, Any]) -> list[str]:
    rng = random.Random(7)
    lines: list[str] = []
    count = 0

    def ev(t: dt.datetime, kind: str, problem: str, attempt: str, data: dict[str, str] | None = None) -> None:
        lines.append(
            json.dumps(
                {
                    "t": t.isoformat(timespec="seconds"),
                    "kind": kind,
                    "problem": problem,
                    "attempt": attempt,
                    "mode": "practice",
                    "data": data or {},
                }
            )
        )

    def attempt(days_ago: int, hh: int, mm: int, p: dict[str, Any], outcome: str, minutes: int | None = None) -> dt.datetime:
        nonlocal count
        count += 1
        a = f"demo{count:04x}"
        start = dt.datetime.combine(TODAY - dt.timedelta(days=days_ago), dt.time(hh, mm)).astimezone()
        target = p["time_target_secs"] // 60
        minutes = minutes or max(6, int(target * rng.uniform(0.6, 0.95)))
        end = start + dt.timedelta(minutes=minutes)
        ev(start, "opened", p["id"], a)
        if outcome == "hint":
            ev(start + dt.timedelta(minutes=3), "hint_revealed", p["id"], a)
        if outcome == "edge":
            ev(end - dt.timedelta(minutes=2), "test_run", p["id"], a, {"passed": "5", "total": "7"})
            ev(end, "gave_up", p["id"], a)
            return end
        if outcome == "stuck":
            ev(end, "gave_up", p["id"], a)
            return end
        ev(end - dt.timedelta(minutes=1), "test_run", p["id"], a, {"passed": "7", "total": "7"})
        ev(end, "passed", p["id"], a, {"elapsed_ms": str(minutes * 60000)})
        return end

    pools = {
        "h": technique(catalog, "arrays", "hash"),
        "t": technique(catalog, "two pointers", "opposite"),
        "s": technique(catalog, "sliding", "variable"),
        "g": technique(catalog, "graphs", "grid"),
        "d": technique(catalog, "dynamic", "1d"),
        "b": technique(catalog, "binary search", "answer"),
        "m": technique(catalog, "stack", "monotonic"),
    }
    next_of = dict.fromkeys(pools, 0)
    passed: list[tuple[int, dict[str, Any]]] = []
    # Weeknights at 9 pm and Saturday mornings; Sundays and the odd day off are skipped.
    for d in range(27, 0, -1):
        weekday = (TODAY - dt.timedelta(days=d)).weekday()
        if weekday == 6 or d % 9 == 0:
            continue
        hh, mm = (10, 0) if weekday == 5 else (21, 0)
        order = ["h", "t", "s"] if d > 18 else (["g", "d", "s", "b"] if d > 8 else ["g", "m", "d", "b", "h"])
        for key in order[: 4 if weekday == 5 else 3]:
            pool = pools[key]
            p = pool[next_of[key] % len(pool)]
            next_of[key] += 1
            outcome = "clean"
            if key == "g":
                outcome = "edge" if rng.random() < 0.65 else "clean"
            elif key == "d":
                outcome = "hint" if rng.random() < 0.6 else "clean"
            elif key == "b" and d < 6:
                outcome = "stuck"
            end = attempt(d, hh, mm, p, outcome, int(p["time_target_secs"] / 60 * 1.3) if key == "m" else None)
            mm = min(59, end.minute + 2) if end.hour == hh else 59
            if outcome in ("clean", "hint"):
                passed.append((d, p))
        for pd, p in passed[:]:
            if pd - d in (1, 3, 7) and rng.random() < 0.7:
                attempt(d, 11 if weekday == 5 else 22, 30, p, "clean")
    return lines


def q(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def sql(catalog: dict[str, Any]) -> str:
    ms = int(NOW.timestamp() * 1000)
    started = TODAY - dt.timedelta(days=28)
    interviews = [
        {"date": str(TODAY + dt.timedelta(days=19)), "company": "google"},
        {"date": str(TODAY + dt.timedelta(days=33)), "company": "meta"},
    ]
    every = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    extra = {
        "goal": "internship",
        "aims": ["interview", "companies"],
        "onboarded": True,
        "plan_started_at": str(started),
        "interviews": interviews,
    }
    log = "\n".join(events(catalog)) + "\n"
    return "\n".join(
        [
            # Every run starts the demo fresh, so its history always ends yesterday.
            *(
                f"DELETE FROM {t} WHERE {c} = {q(USER_ID)};"
                for t, c in [
                    ("sessions", "user_id"),
                    ("identities", "user_id"),
                    ("user_settings", "user_id"),
                    ("progress", "user_id"),
                    ("plans", "user_id"),
                    ("leetcode_solves", "user_id"),
                    ("leetcode_polls", "user_id"),
                    ("users", "id"),
                ]
            ),
            "INSERT INTO users (id, email, username, display_name, avatar_url, created_at) "
            f"VALUES ({q(USER_ID)}, {q(EMAIL)}, 'demo', 'Demo Learner', NULL, {ms});",
            "INSERT INTO identities (provider, provider_user_id, user_id, created_at) "
            f"VALUES ('email', {q(EMAIL)}, {q(USER_ID)}, {ms});",
            "INSERT INTO user_settings (user_id, interview_date, target_companies, daily_minutes, "
            "session_minutes, availability, extra, updated_at) VALUES ("
            f"{q(USER_ID)}, {q(interviews[0]['date'])}, {q(json.dumps(['google']))}, 60, 45, "
            f"{q(json.dumps([{'days': every, 'start': '18:00', 'end': '21:00'}]))}, {q(json.dumps(extra))}, {ms});",
            f"INSERT INTO progress (user_id, events_jsonl, version, updated_at) VALUES ({q(USER_ID)}, {q(log)}, 1, {ms});",
        ]
    )


def main() -> None:
    catalog = json.loads(Path(sys.argv[1]).read_text())
    Path(sys.argv[2]).write_text(sql(catalog) + "\n")
    print(f"Demo learner ready: {EMAIL}, history through {TODAY - dt.timedelta(days=1)}")


if __name__ == "__main__":
    main()
