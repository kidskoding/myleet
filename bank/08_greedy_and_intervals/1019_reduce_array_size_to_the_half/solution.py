from collections import Counter


def min_set_size(arr: list[int]) -> int:
    removed = 0
    for chosen, freq in enumerate(sorted(Counter(arr).values(), reverse=True), start=1):
        removed += freq
        if 2 * removed >= len(arr):
            return chosen
    return 0
