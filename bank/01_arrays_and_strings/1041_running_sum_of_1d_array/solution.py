def running_sum(nums: list[int]) -> list[int]:
    out: list[int] = []
    total = 0
    for x in nums:
        total += x
        out.append(total)
    return out
