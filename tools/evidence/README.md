# Interview evidence

This folder holds a script that counts how often each practice problem shows up in public interview write-ups from 2024 to 2026, so the company playlists can be ordered by real reports.

## How to run it

Run `python3 tools/evidence/collect.py collect` to fetch posts for all 18 companies, or pass company slugs such as `collect nvidia stripe` for a subset. It writes one file per company to `tools/evidence/data/<slug>.json`, with the post count, and for each matched problem the mention count, the last date seen and up to three source URLs.

Run `python3 tools/evidence/collect.py apply` to reorder the playlists from those files. Problems with mentions go first, ordered by mention count and then recency, followed by the old list in its existing order, capped at 50 entries. Google's playlist is never edited. Big Tech sets skip easy problems unless they have three or more mentions. After applying, run `cargo run -q --release -- validate`.

## Sources

The script reads three public sources with no login: the dev.to API (articles tagged interview, leetcode and codinginterview, with the body fetched only when the title or tags name the company), Medium RSS tag feeds (`<company>-interview` and `<company>-interview-questions`), and the Hacker News Algolia search. It keeps posts from 2024 onward, sends a descriptive User-Agent and waits one second between requests. A post is credited to a company only when it is about that company's interview. It does not use LeetCode Premium company tags, tag datasets or mirrors of them, and it does not try to get around login walls or blocks. If a source fails, the script skips it.

## Matching

A post counts once per problem. A problem matches when the post names its LeetCode number ("LC 146", "#146"), its URL slug, or its exact title. Short generic titles such as "two sum" only match through a number or slug.
