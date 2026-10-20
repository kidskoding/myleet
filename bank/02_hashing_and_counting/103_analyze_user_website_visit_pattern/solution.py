from collections import Counter, defaultdict
from itertools import combinations


def most_visited_pattern(username: list[str], timestamp: list[int], website: list[str]) -> list[str]:
    visits: dict[str, list[str]] = defaultdict(list)
    for _, user, site in sorted(zip(timestamp, username, website)):
        visits[user].append(site)

    score: Counter[tuple[str, ...]] = Counter()
    for sites in visits.values():
        score.update(set(combinations(sites, 3)))

    best = min(score, key=lambda pattern: (-score[pattern], pattern))
    return list(best)
