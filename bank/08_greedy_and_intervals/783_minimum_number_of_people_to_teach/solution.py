from collections import Counter


def minimum_teachings(n: int, languages: list[list[int]], friendships: list[list[int]]) -> int:
    known = [set(langs) for langs in languages]
    stuck: set[int] = set()
    for u, v in friendships:
        if not known[u - 1] & known[v - 1]:
            stuck.add(u - 1)
            stuck.add(v - 1)
    if not stuck:
        return 0
    counts = Counter(lang for person in stuck for lang in known[person])
    return len(stuck) - max(counts.values(), default=0)
