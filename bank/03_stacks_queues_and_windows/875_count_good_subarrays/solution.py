BITS = 30


def count_good_subarrays(nums: list[int]) -> int:
    n = len(nums)
    left = [0] * n
    last_bit = [-1] * BITS
    last_same: dict[int, int] = {}
    for i, x in enumerate(nums):
        bound = last_same.get(x, -1)
        for b in range(BITS):
            if x >> b & 1:
                last_bit[b] = i
            elif last_bit[b] > bound:
                bound = last_bit[b]
        left[i] = bound
        last_same[x] = i
    total = 0
    next_bit = [n] * BITS
    for i in range(n - 1, -1, -1):
        x = nums[i]
        bound = n
        for b in range(BITS):
            if x >> b & 1:
                next_bit[b] = i
            elif next_bit[b] < bound:
                bound = next_bit[b]
        total += (i - left[i]) * (bound - i)
    return total
