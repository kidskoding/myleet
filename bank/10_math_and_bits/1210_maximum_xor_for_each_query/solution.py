def get_maximum_xor(nums: list[int], maximum_bit: int) -> list[int]:
    xs = 0
    for x in nums:
        xs ^= x
    mask = (1 << maximum_bit) - 1
    ans: list[int] = []
    for x in reversed(nums):
        ans.append(xs ^ mask)
        xs ^= x
    return ans
