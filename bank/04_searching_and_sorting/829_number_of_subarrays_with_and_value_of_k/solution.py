def count_subarrays(nums: list[int], k: int) -> int:
    total = 0
    ending: dict[int, int] = {}
    for x in nums:
        nxt: dict[int, int] = {x: 1}
        for value, cnt in ending.items():
            anded = value & x
            nxt[anded] = nxt.get(anded, 0) + cnt
        ending = nxt
        total += ending.get(k, 0)
    return total
