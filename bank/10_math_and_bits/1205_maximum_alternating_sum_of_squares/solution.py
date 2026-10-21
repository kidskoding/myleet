def max_alternating_sum(nums: list[int]) -> int:
    squares = sorted(x * x for x in nums)
    m = len(squares) // 2
    return sum(squares[m:]) - sum(squares[:m])
