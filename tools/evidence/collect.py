"""Collect public Reddit interview write-ups per company and count LeetCode problem mentions.

Usage: python3 tools/evidence/collect.py collect [company-slug ...]   # fetch, write data/<slug>.json
       python3 tools/evidence/collect.py apply                       # reorder playlists from data/
Standard library only. Stops a company's fetching on 403/429 instead of retrying with other identities.
"""
import json, re, sys, time, tomllib, urllib.parse, urllib.request, urllib.error
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = Path(__file__).parent / "data"
UA = "myleet-evidence/1.0 (personal study project; reads public search JSON)"
SUBS = ["leetcode", "cscareerquestions", "csMajors"]
KINDS = ["interview", "OA", "onsite", "phone screen"]
CUTOFF = datetime(2024, 1, 1, tzinfo=timezone.utc).timestamp()
DELAY = 2.5
# slug -> (search names, playlist slug: the file name without its NNN_ order prefix)
COMPANIES = {
    "google": (["google"], "google"), "amazon": (["amazon"], "amazon"),
    "microsoft": (["microsoft"], "microsoft"), "meta": (["meta", "facebook"], "meta"),
    "apple": (["apple"], "apple"), "nvidia": (["nvidia"], "nvidia"),
    "netflix": (["netflix"], "netflix"), "bytedance": (["bytedance"], "bytedance"),
    "tiktok": (["tiktok"], "tiktok_bytedance"), "openai": (["openai"], "openai"),
    "anthropic": (["anthropic"], "anthropic"), "spacex": (["spacex"], "spacex"),
    "databricks": (["databricks"], "databricks"), "palantir": (["palantir"], "palantir"),
    "anysphere": (["cursor anysphere", "anysphere"], "anysphere"), "stripe": (["stripe"], "stripe"),
    "xai": (["xai"], "xai"), "scale-ai": (["scale ai"], "scale_ai"),
    "uber": (["uber"], "uber"), "adobe": (["adobe"], "adobe"),
}
BIG = {"uber", "adobe", "google", "amazon", "microsoft", "meta", "apple", "nvidia", "netflix", "bytedance", "tiktok"}


def pool():
    out = []
    for p in list(ROOT.glob("curriculum/**/problem.toml")) + list(ROOT.glob("bank/**/problem.toml")):
        d = tomllib.loads(p.read_text())
        slug = re.search(r"/problems/([^/]+)", d.get("url", ""))
        out.append({"id": d["id"], "title": d["title"], "difficulty": d.get("difficulty"),
                    "lc": d.get("leetcode"), "slug": slug.group(1) if slug else None, "url": d.get("url", "")})
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


def fetch(url):
    time.sleep(DELAY)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def posts_for(names):
    seen, blocked = {}, None
    for name in names:
        for sub in SUBS:
            for kind in KINDS:
                q = urllib.parse.quote_plus(f"{name} {kind}")
                url = f"https://www.reddit.com/r/{sub}/search.json?q={q}&restrict_sr=1&sort=new&t=year&limit=100"
                try:
                    kids = fetch(url)["data"]["children"]
                except urllib.error.HTTPError as e:
                    if e.code in (403, 429):
                        return seen, f"HTTP {e.code} from reddit"
                    continue
                except Exception:
                    continue
                for k in kids:
                    d = k["data"]
                    if d["created_utc"] >= CUTOFF:
                        seen[d["id"]] = d
    return seen, blocked


def collect(slugs):
    P = pool()
    DATA.mkdir(exist_ok=True)
    for slug in slugs:
        posts, blocked = posts_for(COMPANIES[slug][0])
        agg = {}
        for d in posts.values():
            day = datetime.fromtimestamp(d["created_utc"], timezone.utc).date().isoformat()
            url = "https://www.reddit.com" + d["permalink"]
            for pid in match(d["title"] + "\n" + d.get("selftext", ""), P):
                a = agg.setdefault(pid, {"id": pid, "mentions": 0, "last_seen": day, "sources": []})
                a["mentions"] += 1
                a["last_seen"] = max(a["last_seen"], day)
                if len(a["sources"]) < 3:
                    a["sources"].append(url)
        out = {"company": slug, "posts_found": len(posts), "blocked": blocked,
               "problems": sorted(agg.values(), key=lambda a: (-a["mentions"], a["last_seen"]), reverse=False)}
        out["problems"].sort(key=lambda a: (a["mentions"], a["last_seen"]), reverse=True)
        (DATA / f"{slug}.json").write_text(json.dumps(out, indent=2) + "\n")
        print(slug, "posts", len(posts), "problems", len(agg), blocked or "")


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
        entries = [(re.search(r'title = "(.*)"', b).group(1), re.search(r'url = "(.*)"', b).group(1)) for b in blocks]
        diff = lambda title, url: P.get(byurl.get(url.split("/problems/")[-1].strip("/"), {}).get("id", ""), {}).get("difficulty")
        big = slug in BIG
        chosen, seen = [], set()
        for a in ev:
            p = P[a["id"]]
            if p["difficulty"] == "easy" and big and a["mentions"] < 3:
                continue
            if p["url"] and p["url"] not in seen:
                chosen.append((p["title"], p["url"])); seen.add(p["url"])
        rest = [e for e in entries if e[1] not in seen]
        final = (chosen + rest)[:50]
        if not big:
            easy = sum(1 for t, u in final if diff(t, u) == "easy")
            if easy > max(1, round(len(final) * 0.1)):
                print("WARN easy share high", slug, easy, len(final))
        path.write_text(head + "\n" + "\n".join(f'\n[[entries]]\ntitle = "{t}"\nurl = "{u}"' for t, u in final).replace("\n\n[[", "\n[[", 0) + "\n")
        print("updated", fname, len(final))


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "collect"
    if cmd == "collect":
        collect(sys.argv[2:] or list(COMPANIES))
    else:
        apply()
