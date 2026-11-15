# ruff: noqa: E501
"""Count LeetCode problem mentions in public candidate-reported interview posts, then order company playlists.

Usage: python3 tools/evidence/collect.py fetch [slug ...]   # download posts into a cache (slow, 1 request/second)
       python3 tools/evidence/collect.py analyze            # cache -> data/<slug>.json
       python3 tools/evidence/collect.py apply              # data/ -> playlists/ (evidence first, then distinctness)
       python3 tools/evidence/collect.py report             # data/ -> report.md
Standard library only. A source that fails is skipped; there is no retrying with other identities.
"""

import json
import re
import sys
import time
import tomllib
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from email.utils import parsedate_to_datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = Path(__file__).parent / "data"
CACHE = Path("/tmp/myleet_evidence_cache.json")
UA = "myleet-evidence/1.0 (personal study project; reads public APIs and RSS)"
DEVTO_TAGS = ["interview", "leetcode", "codinginterview"]
DELAY = 1.0
SINCE = "2024-01-01"
MIN_POSTS = 2
BIG_EASY_POSTS = 4
MAX_PROBLEMS_PER_POST = 25
GROUP_CAP = 3
OVERALL_CAP = 20
TWO_SUM_CAP = 10
EASY_SHARE = {"AI & Startups": 0.15, "Consumer and Business Tech": 0.15, "Trading Firms": 0.10}
INTERVIEW = re.compile(r"interview|\boa\b|online assessment|on-?site|phone screen|\bloop\b|new[- ]grad", re.I)
EXTRA_ALIASES = {"meta": ["facebook"], "anysphere": ["cursor"], "tiktok_bytedance": ["tiktok", "bytedance"]}
# bare common words that only count when written capitalised ("Linear", not "linear")
CASED = {"apple", "meta", "linear", "notion", "figure", "clay", "ramp", "writer", "modal", "mercury", "glean", "retool", "block"}


def playlists():
    """Every playlist as {slug, path, title, group, focus, aliases}."""
    out = []
    for p in sorted((ROOT / "playlists").glob("[0-9]*_*.toml")):
        d = tomllib.loads(p.read_text())
        slug = p.stem.split("_", 1)[1]
        names = {re.sub(r"\s*\(.*?\)", "", t).strip().lower() for t in re.split(r"\s*/\s*", d["title"])}
        names |= set(EXTRA_ALIASES.get(slug, []))
        names = {n for n in names if len(n) > 2}
        out.append(
            {
                "slug": slug,
                "path": p,
                "title": d["title"],
                "group": d["group"],
                "focus": d.get("focus", ""),
                "aliases": sorted(names),
            }
        )
    return out


def pool():
    out = {}
    for p in list(ROOT.glob("curriculum/**/problem.toml")) + list(ROOT.glob("bank/**/problem.toml")):
        d = tomllib.loads(p.read_text())
        rel = p.relative_to(ROOT).parts
        slug = re.search(r"/problems/([^/]+)", d.get("url", ""))
        out[d["id"]] = {
            "id": d["id"],
            "title": d["title"],
            "difficulty": d.get("difficulty"),
            "lc": d.get("leetcode"),
            "slug": slug.group(1) if slug else None,
            "url": d.get("url", ""),
            "tech": "/".join(rel[:3]) if rel[0] == "curriculum" else "/".join(rel[:2]),
            "module": "/".join(rel[:2]),
            "text": (d["title"] + " " + d.get("key_idea", "") + " " + rel[-3]).lower(),
        }
    return out


NUM = re.compile(r"(?:\b(lc|leetcode)\s*[-:#]?\s*|#\s*|\bproblem\s+(?:no\.?\s*)?)(\d{1,4})\b", re.I)
LCWORD = re.compile(r"\b(?:lc|leetcode)\b", re.I)


def match(text, P):
    """Problem ids a post names by number (next to LC/LeetCode), URL slug or exact title."""
    t = text.lower()
    nums = set()
    for m in NUM.finditer(t):
        if m.group(1) or LCWORD.search(t[max(0, m.start() - 30) : m.end() + 30]):
            nums.add(int(m.group(2)))
    hits = set()
    for p in P.values():
        if p["lc"] and p["lc"] in nums:
            hits.add(p["id"])
        elif p["slug"] and re.search(r"(?<![\w-])" + re.escape(p["slug"]) + r"(?![\w-])", t):
            hits.add(p["id"])
        elif re.search(r"(?<![\w-])" + re.escape(p["title"].lower()) + r"(?![\w-])", t):
            hits.add(p["id"])
    return hits


def names_in(slug_aliases, text):
    for n in slug_aliases:
        flags = 0 if n in CASED else re.I
        pat = n.title() if n in CASED else n
        if re.search(r"(?<![\w])" + re.escape(pat) + r"(?![\w])", text, flags):
            return True
    return False


def about(c, title, body):
    """The company is named with an interview word in the title or the opening paragraph."""
    head = title + "\n" + body[:600]
    return names_in(c["aliases"], head) and bool(INTERVIEW.search(head))


def fetch(url, as_json=True):
    time.sleep(DELAY)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r) if as_json else r.read().decode("utf-8", "replace")


def devto_index():
    seen, out = set(), []
    for tag in DEVTO_TAGS:
        for page in range(1, 6):
            try:
                arts = fetch(f"https://dev.to/api/articles?tag={tag}&per_page=100&page={page}")
            except Exception:
                break
            for a in arts:
                if a["id"] not in seen and a["published_at"] >= SINCE:
                    seen.add(a["id"])
                    out.append(a)
            if len(arts) < 100:
                break
    return out


def fetch_all(slugs):
    cache: dict = json.loads(CACHE.read_text()) if CACHE.exists() else {"devto": [], "bodies": {}, "co": {}}
    if not cache["devto"]:
        cache["devto"] = devto_index()
        CACHE.write_text(json.dumps(cache))
    for c in playlists():
        if slugs and c["slug"] not in slugs or c["slug"] in cache["co"]:
            continue
        posts = {}
        for a in cache["devto"]:
            stub = a["title"] + " " + (a.get("description") or "") + " " + " ".join(a.get("tag_list") or [])
            if names_in(c["aliases"], stub):
                key = str(a["id"])
                if key not in cache["bodies"]:
                    try:
                        cache["bodies"][key] = fetch(f"https://dev.to/api/articles/{a['id']}").get("body_markdown") or ""
                    except Exception:
                        cache["bodies"][key] = ""
                posts[a["url"]] = [a["published_at"][:10], a["title"], cache["bodies"][key]]
        for name in c["aliases"]:
            for suffix in ("interview", "interview-questions"):
                try:
                    xml = fetch(f"https://medium.com/feed/tag/{name.replace(' ', '-')}-{suffix}", as_json=False)
                except Exception:
                    continue
                for item in re.findall(r"<item>(.*?)</item>", xml, re.S):
                    link, date = re.search(r"<link>(.*?)</link>", item), re.search(r"<pubDate>(.*?)</pubDate>", item)
                    ttl = re.search(r"<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</title>", item, re.S)
                    if not link or not date:
                        continue
                    try:
                        d = parsedate_to_datetime(date.group(1)).date().isoformat()
                    except Exception:
                        continue
                    if d >= SINCE:
                        posts[link.group(1)] = [d, ttl.group(1) if ttl else "", re.sub(r"<[^>]+>|&[a-z#0-9]+;", " ", item)]
            q = urllib.parse.quote_plus(f"{name} interview leetcode")
            try:
                hits = fetch(f"https://hn.algolia.com/api/v1/search?query={q}&tags=story&hitsPerPage=100")["hits"]
            except Exception:
                continue
            for h in hits:
                d = (h.get("created_at") or "")[:10]
                if d >= SINCE:
                    posts[f"https://news.ycombinator.com/item?id={h['objectID']}"] = [
                        d,
                        h.get("title") or "",
                        h.get("story_text") or "",
                    ]
        cache["co"][c["slug"]] = posts
        CACHE.write_text(json.dumps(cache))
        print("fetched", c["slug"], len(posts), flush=True)


def analyze():
    P = pool()
    cache = json.loads(CACHE.read_text())
    DATA.mkdir(exist_ok=True)
    for f in DATA.glob("*.json"):
        f.unlink()
    for c in playlists():
        used, found = 0, {}
        for url, (date, title, body) in cache["co"].get(c["slug"], {}).items():
            if not about(c, title, body):
                continue
            hits = match(title + "\n" + body, P)
            if not hits or len(hits) > MAX_PROBLEMS_PER_POST:
                continue
            used += 1
            for h in hits:
                e = found.setdefault(h, {"id": h, "mentions": 0, "last": "", "urls": []})
                e["mentions"] += 1
                e["last"] = max(e["last"], date)
                e["urls"].append(url)
        probs = [e for e in found.values() if e["mentions"] >= MIN_POSTS]
        probs.sort(key=lambda e: (e["mentions"], e["last"]), reverse=True)
        for e in probs:
            e["urls"] = e["urls"][:3]
        (DATA / f"{c['slug']}.json").write_text(
            json.dumps({"company": c["title"], "posts": used, "problems": probs}, indent=1) + "\n"
        )


def read_entries(path):
    head, *blocks = re.split(r"\n(?=\[\[entries\]\])", path.read_text().rstrip() + "\n")
    ents = []
    for b in blocks:
        t, u = re.search(r'title = "(.*)"', b), re.search(r'url = "(.*)"', b)
        if t and u:
            ents.append((t.group(1), u.group(1)))
    return head, ents


def apply():
    P = pool()
    byurl = {p["url"]: p for p in P.values() if p["url"]}
    two_sum = next(p["id"] for p in P.values() if p["lc"] == 1)
    usage = Counter()  # problem -> sets using it without evidence
    gusage = defaultdict(Counter)
    pls = playlists()
    # Google is never edited; its entries still count as unevidenced use
    plans = {}
    for c in pls:
        head, ents = read_entries(c["path"])
        ids = [byurl[u]["id"] if u in byurl else None for _, u in ents]
        if c["slug"] == "google":
            for i in ids:
                if i:
                    usage[i] += 1
                    gusage[c["group"]][i] += 1
            continue
        ev = json.loads((DATA / f"{c['slug']}.json").read_text())["problems"]
        big = c["group"] == "Big Tech"
        evid = []
        for e in ev:
            p = P[e["id"]]
            canon = byurl.get(p["url"], {}).get("id")
            if canon and canon not in evid and not (p["difficulty"] == "easy" and big and e["mentions"] < BIG_EASY_POSTS):
                evid.append(canon)
        cap = None if big or c["group"] == "Fortune 500" else EASY_SHARE[c["group"]]
        n = max(30, min(50, len(ents)))
        if cap is not None:  # evidenced easy problems also count against the share
            keep, easy = [], 0
            for i in evid:
                if P[i]["difficulty"] == "easy":
                    if easy >= int(cap * n):
                        continue
                    easy += 1
                keep.append(i)
            evid = keep
        plans[c["slug"]] = (c, head, evid, [i for i in ids if i and i not in evid], n)
    allids = [p["id"] for p in byurl.values()]
    toks = lambda s: {w for w in re.findall(r"[a-z]{4,}", s.lower())}  # noqa: E731

    def allowed(i, c):
        if i == two_sum:
            return c["group"] == "Fortune 500" and usage[i] < TWO_SUM_CAP
        return gusage[c["group"]][i] < GROUP_CAP and usage[i] < OVERALL_CAP

    for slug, (c, head, evid, rest, n) in plans.items():
        big, group = c["group"] == "Big Tech", c["group"]
        cap = None if big or group == "Fortune 500" else EASY_SHARE[group]
        easy_left = 10**6 if cap is None else int(cap * n) - sum(P[i]["difficulty"] == "easy" for i in evid)
        if big:
            easy_left = 0
        final = list(evid)
        used = set(final)
        ftoks = toks(c["focus"] + " " + c["title"])
        for i in rest[: max(0, n - len(final))]:
            d = P[i]["difficulty"]
            ok = i not in used and allowed(i, c)
            if ok and d == "easy":
                ok = easy_left > 0
                easy_left -= ok
            if ok:
                final.append(i)
                used.add(i)
                usage[i] += 1
                gusage[group][i] += 1
            else:  # pick a stand-in from the same technique, then module, then anywhere
                final.append(("swap", i))
        # fill any shortfall (untracked or dropped entries) with swaps
        while len(final) < n:
            final.append(("swap", None))
        out = []
        for slot in final:
            if not isinstance(slot, tuple):
                out.append(slot)
                continue
            old = P.get(slot[1]) if slot[1] else None
            tier_t, tier_m = (old["tech"], old["module"]) if old else (None, None)
            want = "medium" if not old or old["difficulty"] == "easy" else old["difficulty"]
            best, bkey = None, None
            for j in allids:
                p = P[j]
                if j in used or p["difficulty"] != want or not p["url"] or j == two_sum or not allowed(j, c):
                    continue
                key = (
                    0 if p["tech"] == tier_t else 1 if p["module"] == tier_m else 2,
                    -min(2, len(ftoks & toks(p["text"]))),
                    usage[j],
                    j,
                )
                if bkey is None or key < bkey:
                    best, bkey = j, key
            if best is None:
                continue
            out.append(best)
            used.add(best)
            usage[best] += 1
            gusage[group][best] += 1
        body = "\n".join(f'\n[[entries]]\ntitle = "{P[i]["title"]}"\nurl = "{P[i]["url"]}"' for i in out)
        c["path"].write_text(head + "\n" + body + "\n")
    print("applied", len(plans))


def share_counts():
    P = pool()
    byurl = {p["url"]: p["id"] for p in P.values() if p["url"]}
    cnt = Counter()
    for c in playlists():
        cnt.update({byurl[u] for _, u in read_entries(c["path"])[1] if u in byurl})
    return P, cnt


def conf(n):
    return "none" if n == 0 else "low" if n <= 2 else "medium" if n <= 6 else "good"


def report(before=None):
    P, cnt = share_counts()
    rows = ["| Company | Posts used | Evidenced problems | Confidence |", "| --- | --- | --- | --- |"]
    levels = Counter()
    for c in playlists():
        d = json.loads((DATA / f"{c['slug']}.json").read_text())
        k = len(d["problems"])
        levels[conf(k)] += 1
        rows.append(f"| {c['title']} | {d['posts']} | {k} | {conf(k)} |")

    def top(cn):
        return [f"| {P[i]['title']} | {n} |" for i, n in cn.most_common(10)]

    b = before or json.loads((DATA.parent / "before.json").read_text())
    bt = [f"| {P[i]['title']} | {n} |" for i, n in sorted(b["counts"].items(), key=lambda x: -x[1])[:10]]
    text = f"""# Evidence report

Each playlist was checked against public dev.to, Medium and Hacker News posts from 2024 on. A post counts for a company only when its title or opening paragraph names the company next to an interview word, and posts that list more than 25 problems are skipped. A problem is evidenced when at least 2 distinct posts mention it (4 for an easy problem in Big Tech).

Confidence is none with no evidenced problems, low with 1 to 2, medium with 3 to 6 and good with 7 or more. Of {sum(levels.values())} companies, {levels["none"]} are none, {levels["low"]} low, {levels["medium"]} medium and {levels["good"]} good.

## Distinctness

Problems that are not evidenced for a company are capped at {GROUP_CAP} sets per group and {OVERALL_CAP} sets overall, and Two Sum stays only where evidenced or in up to {TWO_SUM_CAP} Fortune 500 sets.

Problems used in 30 or more sets: {sum(1 for n in b["counts"].values() if n >= 30)} before, {sum(1 for n in cnt.values() if n >= 30)} after.

Most shared before:

| Problem | Sets |
| --- | --- |
{chr(10).join(bt)}

Most shared after:

| Problem | Sets |
| --- | --- |
{chr(10).join(top(cnt))}

## Companies

{chr(10).join(rows)}
"""
    (Path(__file__).parent / "report.md").write_text(text)


def snapshot_before():
    f = DATA.parent / "before.json"
    if not f.exists():
        _, cnt = share_counts()
        f.write_text(json.dumps({"counts": cnt}))


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "fetch"
    if cmd == "fetch":
        fetch_all(set(sys.argv[2:]))
    elif cmd == "analyze":
        analyze()
    elif cmd == "apply":
        snapshot_before()
        apply()
    else:
        report()
