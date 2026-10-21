def find_prefix_score(nums: list[int]) -> list[int]:
    ans: list[int] = []
    running_max = 0
    total = 0
    for x in nums:
        running_max = max(running_max, x)
        total += x + running_max
        ans.append(total)
    return ans
