def maximum_mex(nums: list[int]) -> list[int]:
    n = len(nums)
    suffix_mex = [0] * (n + 1)
    present: set[int] = set()
    mex = 0
    for i in range(n - 1, -1, -1):
        present.add(nums[i])
        while mex in present:
            mex += 1
        suffix_mex[i] = mex

    result = []
    i = 0
    while i < n:
        target = suffix_mex[i]
        if target == 0:
            result.append(0)
            i += 1
            continue
        needed: set[int] = set()
        while len(needed) < target:
            if nums[i] < target:
                needed.add(nums[i])
            i += 1
        result.append(target)
    return result
