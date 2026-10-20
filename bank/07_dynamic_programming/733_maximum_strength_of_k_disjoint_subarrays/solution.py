def maximum_strength(nums: list[int], k: int) -> int:
    neg = float("-inf")
    open_ = [neg] * (k + 1)
    done = [neg] * (k + 1)
    done[0] = 0
    for x in nums:
        for j in range(k, 0, -1):
            weight = (k - j + 1) * (1 if j % 2 else -1)
            open_[j] = max(open_[j], done[j - 1]) + weight * x
            done[j] = max(done[j], open_[j])
    return done[k]
