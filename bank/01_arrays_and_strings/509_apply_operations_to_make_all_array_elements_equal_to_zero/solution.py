def check_array(nums: list[int], k: int) -> bool:
    n = len(nums)
    ends = [0] * (n + 1)
    active = 0
    for i, value in enumerate(nums):
        active -= ends[i]
        remaining = value - active
        if remaining < 0:
            return False
        if remaining > 0:
            if i + k > n:
                return False
            active += remaining
            ends[i + k] += remaining
    return True
