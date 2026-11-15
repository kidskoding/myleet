# Interview evidence

This folder holds a script that counts how often each practice problem shows up in public interview write-ups from 2024 to 2026, so the company playlists can be ordered by real reports.

## How to run it

Run `python3 tools/evidence/collect.py collect` to fetch posts for all 18 companies, or pass company slugs such as `collect nvidia stripe` for a subset. It writes one file per company to `tools/evidence/data/<slug>.json`, with the post count, and for each matched problem the mention count, the last date seen and up to three source URLs.

Run `python3 tools/evidence/collect.py apply` to reorder the playlists from those files. Problems with mentions go first, ordered by mention count and then recency, followed by the old list in its existing order, capped at 50 entries. Google's playlist is never edited. Big Tech sets skip easy problems unless they have three or more mentions. After applying, run `cargo run -q --release -- validate`.

## Sources

The script reads Reddit's public search JSON for r/leetcode, r/cscareerquestions and r/csMajors, with interview, OA, onsite and phone screen variants of each query. It sends a descriptive User-Agent and waits two and a half seconds between requests. It does not use LeetCode Premium company tags, tag datasets or mirrors of them, and it does not try to get around login walls or blocks. If Reddit answers 403 or 429, the script stops for that company and records the block in the data file.

## Matching

A post counts once per problem. A problem matches when the post names its LeetCode number ("LC 146", "#146"), its URL slug, or its exact title. Short generic titles such as "two sum" only match through a number or slug.
