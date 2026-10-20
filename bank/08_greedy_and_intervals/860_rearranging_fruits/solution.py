from collections import Counter


def min_cost(basket1: list[int], basket2: list[int]) -> int:
    total = Counter(basket1) + Counter(basket2)
    if any(c % 2 for c in total.values()):
        return -1
    first = Counter(basket1)
    surplus = []
    for value, c in total.items():
        diff = first[value] - c // 2
        surplus.extend([value] * abs(diff))
    surplus.sort()
    cheapest = min(total)
    return sum(min(x, 2 * cheapest) for x in surplus[: len(surplus) // 2])
