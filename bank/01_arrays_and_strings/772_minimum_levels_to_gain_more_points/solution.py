def minimum_levels(possible: list[int]) -> int:
    scores = [1 if p else -1 for p in possible]
    total = sum(scores)
    alice = 0
    for i in range(len(scores) - 1):
        alice += scores[i]
        if alice > total - alice:
            return i + 1
    return -1
