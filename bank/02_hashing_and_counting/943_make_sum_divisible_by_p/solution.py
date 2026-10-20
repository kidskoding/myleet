def min_subarray(nums: list[int], p: int) -> int:
    need = sum(nums) % p
    if need == 0:
        return 0
    last = {0: -1}
    prefix = 0
    best = len(nums)
    for i, x in enumerate(nums):
        prefix = (prefix + x) % p
        want = (prefix - need) % p
        if want in last:
            best = min(best, i - last[want])
        last[prefix] = i
    return best if best < len(nums) else -1
