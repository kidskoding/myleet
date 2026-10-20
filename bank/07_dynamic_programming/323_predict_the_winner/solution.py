def predict_the_winner(nums: list[int]) -> bool:
    n = len(nums)
    diff = list(nums)
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            diff[i] = max(nums[i] - diff[i + 1], nums[j] - diff[i])
    return diff[0] >= 0
