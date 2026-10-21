def max_subarrays(n: int, conflicting_pairs: list[list[int]]) -> int:
    conflicts: list[list[int]] = [[] for _ in range(n + 1)]
    for a, b in conflicting_pairs:
        conflicts[max(a, b)].append(min(a, b))
    valid = 0
    max_left = 0
    second_max_left = 0
    gains = [0] * (n + 1)
    for right in range(1, n + 1):
        for left in conflicts[right]:
            if left > max_left:
                second_max_left = max_left
                max_left = left
            elif left > second_max_left:
                second_max_left = left
        valid += right - max_left
        gains[max_left] += max_left - second_max_left
    return valid + max(gains)
