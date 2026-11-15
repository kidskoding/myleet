"""Collect public dev.to, Medium RSS and Hacker News interview write-ups per company and count LeetCode problem mentions.

Usage: python3 tools/evidence/collect.py collect [company-slug ...]   # fetch, write data/<slug>.json
       python3 tools/evidence/collect.py apply                       # reorder playlists from data/
Standard library only. A source that fails is skipped; there is no retrying with other identities.
"""

import json
import re
import sys
import time
import tomllib
import urllib.error
import urllib.parse
import urllib.request
from email.utils import parsedate_to_datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = Path(__file__).parent / "data"
UA = "myleet-evidence/1.0 (personal study project; reads public APIs and RSS)"
DEVTO_TAGS = ["interview", "leetcode", "codinginterview"]
DELAY = 1.0
# slug -> (search names, playlist slug: the file name without its NNN_ order prefix)
COMPANIES = {
    "google": (["google"], "google"),
    "amazon": (["amazon"], "amazon"),
    "microsoft": (["microsoft"], "microsoft"),
    "meta": (["meta", "facebook"], "meta"),
    "apple": (["apple"], "apple"),
    "nvidia": (["nvidia"], "nvidia"),
    "netflix": (["netflix"], "netflix"),
    "bytedance": (["bytedance"], "bytedance"),
    "tiktok": (["tiktok"], "tiktok_bytedance"),
    "openai": (["openai"], "openai"),
    "anthropic": (["anthropic"], "anthropic"),
    "spacex": (["spacex"], "spacex"),
    "databricks": (["databricks"], "databricks"),
    "palantir": (["palantir"], "palantir"),
    "anysphere": (["cursor anysphere", "anysphere"], "anysphere"),
    "stripe": (["stripe"], "stripe"),
    "xai": (["xai"], "xai"),
    "scale-ai": (["scale ai"], "scale_ai"),
    "uber": (["uber"], "uber"),
    "adobe": (["adobe"], "adobe"),
}
BIG = {"uber", "adobe", "google", "amazon", "microsoft", "meta", "apple", "nvidia", "netflix", "bytedance", "tiktok"}


def pool():
    out = []
    for p in list(ROOT.glob("curriculum/**/problem.toml")) + list(ROOT.glob("bank/**/problem.toml")):
        d = tomllib.loads(p.read_text())
        slug = re.search(r"/problems/([^/]+)", d.get("url", ""))
        out.append(
            {
                "id": d["id"],
                "title": d["title"],
                "difficulty": d.get("difficulty"),
                "lc": d.get("leetcode"),
                "slug": slug.group(1) if slug else None,
                "url": d.get("url", ""),
            }
        )
    return out


def match(text, P):
    t = text.lower()
    hits = set()
    nums = {int(n) for n in re.findall(r"(?:\blc\b|leetcode|\blc-|#)\s*[:.]?\s*(\d{1,4})\b", t)}
    for p in P:
        if p["lc"] and p["lc"] in nums:
            hits.add(p["id"])
        if p["slug"] and p["slug"] in t:
            hits.add(p["id"])
        title = p["title"].lower()
        # short or generic titles ("two sum") need a number or slug; too vague otherwise
        if (len(title.split()) >= 3 or len(title) >= 14) and re.search(r"(?<!\w)" + re.escape(title) + r"(?!\w)", t):
            hits.add(p["id"])
    return hits


def fetch(url, as_json=True):
    time.sleep(DELAY)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r) if as_json else r.read().decode("utf-8", "replace")


def about(names, text):
    return any(re.search(r"(?<!\w)" + re.escape(n) + r"(?!\w)", text.lower()) for n in names)


_devto = []


def devto_index():
    """All recent dev.to interview-tagged article stubs, fetched once."""
    if not _devto:
        seen = set()
        for tag in DEVTO_TAGS:
            for page in range(1, 6):
                try:
                    arts = fetch(f"https://dev.to/api/articles?tag={tag}&per_page=100&page={page}")
                except Exception:
                    break
                for a in arts:
                    if a["id"] not in seen and a["published_at"] >= "2024-01-01":
                        seen.add(a["id"])
                        _devto.append(a)
                if len(arts) < 100:
                    break
    return _devto


def posts_for(names):
    """Return ({url: (date, text)}, {source: count}); a failing source is skipped."""
    posts, counts = {}, {"devto": 0, "medium": 0, "hn": 0}
    for a in devto_index():
        if about(names, a["title"] + " " + " ".join(a.get("tag_list") or [])):
            try:
                body = fetch(f"https://dev.to/api/articles/{a['id']}").get("body_markdown") or ""
            except Exception:
                body = ""
            posts[a["url"]] = (a["published_at"][:10], a["title"] + "\n" + body)
            counts["devto"] += 1
    for name in names:
        for suffix in ("interview", "interview-questions"):
            try:
                xml = fetch(f"https://medium.com/feed/tag/{name.replace(' ', '-')}-{suffix}", as_json=False)
            except Exception:
                continue
            for item in re.findall(r"<item>(.*?)</item>", xml, re.S):
                link = re.search(r"<link>(.*?)</link>", item)
                date = re.search(r"<pubDate>(.*?)</pubDate>", item)
                if not link or not date:
                    continue
                try:
                    d = parsedate_to_datetime(date.group(1)).date().isoformat()
                except Exception:
                    continue
                if d >= "2024-01-01" and link.group(1) not in posts:
                    posts[link.group(1)] = (d, re.sub(r"<[^>]+>|&[a-z#0-9]+;", " ", item))
                    counts["medium"] += 1
        q = urllib.parse.quote_plus(f"{name} interview leetcode")
        try:
            hits = fetch(f"https://hn.algolia.com/api/v1/search?query={q}&tags=story&hitsPerPage=100")["hits"]
        except Exception:
            continue
        for h in hits:
            d = (h.get("created_at") or "")[:10]
            if d >= "2024-01-01" and about(names, h.get("title") or ""):
                u = f"https://news.ycombinator.com/item?id={h['objectID']}"
                posts[u] = (d, (h.get("title") or "") + "\n" + (h.get("story_text") or ""))
                counts["hn"] += 1
    return posts, counts


def collect(slugs):
    P = pool()
    DATA.mkdir(exist_ok=True)
    for slug in slugs:
        posts, counts = posts_for(COMPANIES[slug][0])
        agg = {}
        for url, (day, text) in posts.items():
            for pid in match(text, P):
                a = agg.setdefault(pid, {"id": pid, "mentions": 0, "last_seen": day, "sources": []})
                a["mentions"] += 1
                a["last_seen"] = max(a["last_seen"], day)
                if len(a["sources"]) < 3:
                    a["sources"].append(url)
        out = {"company": slug, "posts_found": len(posts), "by_source": counts, "problems": []}
        out["problems"] = sorted(agg.values(), key=lambda a: (a["mentions"], a["last_seen"]), reverse=True)
        (DATA / f"{slug}.json").write_text(json.dumps(out, indent=2) + "\n")
        print(slug, "posts", len(posts), counts, "problems", len(agg))


def apply():
    P = {p["id"]: p for p in pool()}
    byurl = {p["slug"]: p for p in P.values() if p["slug"]}
    for slug, (_, fname) in COMPANIES.items():
        f = DATA / f"{slug}.json"
        if slug == "google" or not f.exists():
            continue
        ev = json.loads(f.read_text())["problems"]
        if not ev:
            continue
        path = next((ROOT / "playlists").glob(f"[0-9]*_{fname}.toml"))
        head, *blocks = re.split(r"\n(?=\[\[entries\]\])", path.read_text().rstrip() + "\n")
        entries = []
        for b in blocks:
            t, u = re.search(r'title = "(.*)"', b), re.search(r'url = "(.*)"', b)
            if t and u:
                entries.append((t.group(1), u.group(1)))

        def diff(url: str) -> str | None:
            meta = byurl.get(url.split("/problems/")[-1].strip("/"), {})
            return P.get(meta.get("id", ""), {}).get("difficulty")

        big = slug in BIG
        chosen, seen = [], set()
        for a in ev:
            p = P[a["id"]]
            if p["difficulty"] == "easy" and big and a["mentions"] < 3:
                continue
            if p["url"] and p["url"] not in seen:
                chosen.append((p["title"], p["url"]))
                seen.add(p["url"])
        rest = [e for e in entries if e[1] not in seen]
        final = (chosen + rest)[:50]
        if not big:
            easy = sum(1 for _, u in final if diff(u) == "easy")
            if easy > max(1, round(len(final) * 0.1)):
                print("WARN easy share high", slug, easy, len(final))
        body = "\n".join(f'\n[[entries]]\ntitle = "{t}"\nurl = "{u}"' for t, u in final)
        path.write_text(head + "\n" + body + "\n")
        print("updated", fname, len(final))


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "collect"
    if cmd == "collect":
        collect(sys.argv[2:] or list(COMPANIES))
    else:
        apply()
