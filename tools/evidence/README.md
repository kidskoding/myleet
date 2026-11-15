# Interview evidence

This folder holds a script that finds LeetCode problems named in public, candidate-reported interview posts from 2024 on, so the company playlists lead with real reports.

## How to run it

Run `python3 tools/evidence/collect.py fetch` to download posts for every playlist company into a cache in `/tmp`. It waits one second between requests and takes about half an hour. Then run `analyze` to write `data/<slug>.json` (posts used, evidenced problems with counts, last date and up to three source URLs), `apply` to reorder the playlists and `report` to write `report.md`. Google's playlist is never edited. Afterwards run `just ci-content` and `just ci-python`.

## Sources

The script reads the dev.to API (articles tagged interview, leetcode and codinginterview), Medium RSS tag feeds and the Hacker News Algolia search, with no login and a descriptive User-Agent. A source that fails is skipped. It does not use LeetCode Premium company tags or mirrors of them.

## Matching

A post counts for a company only when its title or opening paragraph names the company next to an interview word such as interview, OA, onsite or phone screen. Posts that list more than 25 problems are study lists and are skipped. A problem matches by exact title, URL slug, or a number written as "LC 146", "LeetCode 146", "#146" or "problem 146" with "LeetCode" or "LC" within about 30 characters. A problem is evidenced when at least 2 distinct posts mention it, or 4 for an easy problem in Big Tech.

## Ordering

Evidenced problems go first, by post count and then recency. The rest keep their curated order. A problem without evidence for a company may appear in at most 3 sets per group and 20 sets overall, and Two Sum without evidence only in up to 10 Fortune 500 sets. Excess entries are swapped for the least-used problem from the same technique, then the same module, preferring words from the set's focus line. Difficulty limits per group and 30 to 50 entries are kept.
