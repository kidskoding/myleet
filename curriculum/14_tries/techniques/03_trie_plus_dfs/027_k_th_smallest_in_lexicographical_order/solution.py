from __future__ import annotations


def find_kth_number(n: int, k: int) -> int:
    # Problem 27: K-th Smallest in Lexicographical Order
    # Time: O(log^2 n)
    # Space: O(1)

    def count_under(prefix: int) -> int:
        total = 0
        first = prefix
        next_prefix = prefix + 1
        while first <= n:
            total += min(n + 1, next_prefix) - first
            first *= 10
            next_prefix *= 10
        return total

    curr = 1
    k -= 1
    while k > 0:
        steps = count_under(curr)
        if steps <= k:
            curr += 1
            k -= steps
        else:
            curr *= 10
            k -= 1
    return curr
