def sum_even_after_queries(nums: list[int], queries: list[list[int]]) -> list[int]:
    even = sum(x for x in nums if x % 2 == 0)
    ans: list[int] = []
    for val, idx in queries:
        if nums[idx] % 2 == 0:
            even -= nums[idx]
        nums[idx] += val
        if nums[idx] % 2 == 0:
            even += nums[idx]
        ans.append(even)
    return ans
