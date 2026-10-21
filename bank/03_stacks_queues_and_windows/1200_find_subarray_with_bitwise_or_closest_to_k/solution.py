def minimum_difference(nums: list[int], k: int) -> int:
    ans = float("inf")
    prev: set[int] = set()
    for num in nums:
        curr = {num} | {val | num for val in prev}
        ans = min(ans, min(abs(val - k) for val in curr))
        prev = curr
    return int(ans)
