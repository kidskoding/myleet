import itertools
import math


def minimum_moves(nums: list[int], k: int, max_changes: int) -> int:
    one_indices = [i for i, num in enumerate(nums) if num == 1]
    prefix = list(itertools.accumulate(one_indices, initial=0))
    min_ones = max(0, k - max_changes)
    max_ones = min(k, min_ones + 3, len(one_indices))
    ans = math.inf
    for ones in range(min_ones, max_ones + 1):
        cost_changes = (k - ones) * 2
        if ones == 0:
            ans = min(ans, cost_changes)
            continue
        for left in range(len(one_indices) - ones + 1):
            right = left + ones
            cost_move = (prefix[right] - prefix[(left + right) // 2]) - (
                prefix[(left + right + 1) // 2] - prefix[left]
            )
            ans = min(ans, cost_changes + cost_move)
    return int(ans)
