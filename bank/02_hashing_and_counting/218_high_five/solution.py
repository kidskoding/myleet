from collections import defaultdict


def high_five(items: list[list[int]]) -> list[list[int]]:
    scores: defaultdict[int, list[int]] = defaultdict(list)
    for student, score in items:
        scores[student].append(score)
    return [[student, sum(sorted(scores[student], reverse=True)[:5]) // 5] for student in sorted(scores)]
