from collections import defaultdict

MOD = 10**9 + 7


def count_subranges(nums1: list[int], nums2: list[int]) -> int:
    total = 0
    ending: dict[int, int] = {}
    for a, b in zip(nums1, nums2):
        nxt: dict[int, int] = defaultdict(int)
        nxt[a] += 1
        nxt[-b] += 1
        for diff, ways in ending.items():
            nxt[diff + a] = (nxt[diff + a] + ways) % MOD
            nxt[diff - b] = (nxt[diff - b] + ways) % MOD
        ending = nxt
        total = (total + ending.get(0, 0)) % MOD
    return total
