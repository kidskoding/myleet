"""List playlists whose `focus` names topics the set barely covers.

Usage: python3 tools/playlists/audit.py <out.json>
"""

import collections
import glob
import json
import re
import sys
import tomllib


def slug(u):
    m = re.search(r"/problems/([^/?#]+)", u)
    return m.group(1) if m else None


TOP = {
    "graph": r"graph|grid|bfs|dfs|topolog|shortest path|union",
    "tree": r"tree",
    "dp": r"dynamic programming|\bdp\b",
    "window": r"sliding window",
    "stack": r"stack|queue|parenthes",
    "twoptr": r"two pointer",
    "heap": r"heap|priority|k-?th|top k",
    "interval": r"interval|meeting",
    "bsearch": r"binary search",
    "linked": r"linked list",
    "trie": r"trie|prefix tree",
    "backtrack": r"backtrack|permutation|subset|combination",
    "greedy": r"greedy",
    "bit": r"\bbit",
    "hash": r"hash|array|string",
}
MOD = {
    "10_graphs": "graph",
    "07_trees": "tree",
    "11_dp": "dp",
    "04_sliding_window": "window",
    "03_stacks_and_queues": "stack",
    "02_two_pointers": "twoptr",
    "08_heaps": "heap",
    "13_intervals": "interval",
    "05_binary_search": "bsearch",
    "06_linked_lists": "linked",
    "14_tries": "trie",
    "09_backtracking": "backtrack",
    "12_greedy_algorithms": "greedy",
    "15_bit_manipulation": "bit",
    "01_arrays_and_hashing": "hash",
}
BANKMAP = [
    ("graph", "graph"),
    ("tree", "tree"),
    ("linked", "linked"),
    ("dynamic", "dp"),
    ("stack", "stack"),
    ("window", "window"),
    ("search", "bsearch"),
    ("sort", "bsearch"),
    ("hash", "hash"),
    ("array", "hash"),
    ("string", "hash"),
]
topic = {}
for q in glob.glob("curriculum/**/problem.toml", recursive=True) + glob.glob("bank/**/problem.toml", recursive=True):
    d = tomllib.load(open(q, "rb"))
    s = slug(d.get("url") or "")
    if not s or s in topic:
        continue
    parts = q.split("/")
    if parts[0] == "curriculum":
        topic[s] = MOD.get(parts[1])
    else:
        topic[s] = next((t for k, t in BANKMAP if k in parts[1]), None)
rows = []
for f in sorted(glob.glob("playlists/*.toml")):
    p = tomllib.load(open(f, "rb"))
    focus = (p.get("focus") or "").lower()
    named = [t for t, rx in TOP.items() if re.search(rx, focus)]
    c = collections.Counter(topic.get(slug(e["url"])) for e in p["entries"])
    missing = [t for t in named if c[t] < 2 and t != "hash"]
    if missing:
        rows.append((len(missing), p["title"], p["group"], missing, {t: c[t] for t in named}))
rows.sort(key=lambda r: -r[0])
print(len(rows), "sets name topics they barely cover")
for r in rows[:25]:
    print(r[0], r[1], "|", r[2], "| missing:", ",".join(r[3]))
json.dump([[r[1], r[3]] for r in rows], open(sys.argv[1], "w"))
