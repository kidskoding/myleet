def count_subarrays(nums: list[int], k: int) -> int:
    n = len(nums)
    pos = nums.index(k)
    freq: dict[int, int] = {0: 1}
    balance = 0
    for i in range(pos - 1, -1, -1):
        balance += 1 if nums[i] > k else -1
        freq[balance] = freq.get(balance, 0) + 1
    ans = 0
    balance = 0
    for i in range(pos, n):
        if i != pos:
            balance += 1 if nums[i] > k else -1
        ans += freq.get(-balance, 0) + freq.get(1 - balance, 0)
    return ans
