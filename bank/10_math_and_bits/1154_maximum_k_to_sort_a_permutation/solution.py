def sort_permutation(nums: list[int]) -> int:
    result = -1
    for i, value in enumerate(nums):
        if value != i:
            result &= value
    return 0 if result == -1 else result
