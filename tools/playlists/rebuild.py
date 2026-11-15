"""Rebuild playlists so the first topics named in `focus` get the largest share.

Usage: python3 tools/playlists/rebuild.py <slug> [<slug> ...]  (keeps the first 8 entries and the set size)
"""

import collections
import glob
import re
import sys
import tomllib


def slug(u):
    m = re.search(r"/problems/([^/?#]+)", u)
    return m.group(1) if m else None


WORD = {
    "graphs": "10_graphs",
    "trees": "07_trees",
    "heaps": "08_heaps",
    "dynamic programming": "11_dp",
    "sliding window": "04_sliding_window",
    "stacks": "03_stacks_and_queues",
    "intervals": "13_intervals",
    "binary search": "05_binary_search",
    "linked lists": "06_linked_lists",
    "tries": "14_tries",
    "backtracking": "09_backtracking",
    "greedy": "12_greedy_algorithms",
    "bit manipulation": "15_bit_manipulation",
    "two pointers": "02_two_pointers",
    "arrays and strings": "01_arrays_and_hashing",
    "data-structure design": "17_advanced",
}
pool = {}
for q in sorted(glob.glob("curriculum/**/problem.toml", recursive=True)):
    d = tomllib.load(open(q, "rb"))
    s = slug(d.get("url") or "")
    if s and s not in pool:
        pool[s] = dict(title=d["title"], url=d["url"], diff=d["difficulty"], mod=q.split("/")[1])


def topics(text):
    return [WORD[w] for w in sorted((w for w in WORD if w in text), key=text.find)]


for name in sys.argv[1:]:
    f = glob.glob(f"playlists/*_{name}.toml")[0]
    txt = open(f).read()
    p = tomllib.load(open(f, "rb"))
    L = topics(p["focus"].split(";")[0])
    ents = [(e["title"], e["url"]) for e in p["entries"]]
    total = len(ents)
    keep = ents[:8]
    used = {slug(u) for _, u in keep}
    shares = dict(zip(L, [0.28, 0.20, 0.15, 0.10]))
    if "17_advanced" in shares:
        shares["17_advanced"] = min(shares["17_advanced"], 0.10)
    out = list(keep)
    cur = [slug(u) for _, u in ents]
    have = collections.Counter(pool.get(slug(u), {}).get("mod") for _, u in keep)
    for mod, sh in shares.items():
        n = max(0, round(sh * total) - have[mod])
        cands = [
            s for s in cur + list(pool) if s in pool and pool[s]["mod"] == mod and pool[s]["diff"] != "easy" and s not in used
        ]
        seen = []
        [seen.append(x) for x in cands if x not in seen]
        hard = [x for x in seen if pool[x]["diff"] == "hard"][: max(1, n // 3)]
        med = [x for x in seen if pool[x]["diff"] == "medium" and x not in hard][: n - len(hard)]
        for x in med + hard:
            if len(out) >= total:
                break
            out.append((pool[x]["title"], pool[x]["url"]))
            used.add(x)
    for s in cur:  # top up from the old set to keep its size
        if len(out) >= total:
            break
        if s and s not in used and s in pool and pool[s]["diff"] != "easy":
            out.append((pool[s]["title"], pool[s]["url"]))
            used.add(s)
    head = txt.split("[[entries]]")[0]
    open(f, "w").write(head + "".join(f'[[entries]]\ntitle = "{a}"\nurl = "{b}"\n\n' for a, b in out).rstrip() + "\n")
    c = collections.Counter(pool.get(slug(u), {}).get("mod", "bank") for _, u in out)
    print(name, len(out), c.most_common(4))
