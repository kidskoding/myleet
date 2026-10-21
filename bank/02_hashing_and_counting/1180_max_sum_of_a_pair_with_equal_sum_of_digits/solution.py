def maximum_sum(nums: list[int]) -> int:
    best: dict[int, int] = {}
    ans = -1
    for num in nums:
        digit_sum = 0
        x = num
        while x:
            digit_sum += x % 10
            x //= 10
        if digit_sum in best:
            ans = max(ans, best[digit_sum] + num)
            best[digit_sum] = max(best[digit_sum], num)
        else:
            best[digit_sum] = num
    return ans
