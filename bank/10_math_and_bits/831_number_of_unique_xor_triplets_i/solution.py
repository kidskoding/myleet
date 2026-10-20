def unique_xor_triplets(nums: list[int]) -> int:
    n = len(nums)
    if n <= 2:
        return n
    return 1 << n.bit_length()
