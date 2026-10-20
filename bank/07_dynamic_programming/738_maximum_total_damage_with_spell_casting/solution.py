from collections import Counter


def maximum_total_damage(power: list[int]) -> int:
    count = Counter(power)
    values = sorted(count)
    best = [0] * (len(values) + 1)
    j = 0
    for i, value in enumerate(values):
        while values[j] < value - 2:
            j += 1
        best[i + 1] = max(best[i], best[j] + value * count[value])
    return best[-1]
