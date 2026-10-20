def shuffle(nums: list[int], n: int) -> list[int]:
    out: list[int] = []
    for i in range(n):
        out.append(nums[i])
        out.append(nums[n + i])
    return out
