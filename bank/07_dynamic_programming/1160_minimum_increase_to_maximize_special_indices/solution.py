def min_increase(nums: list[int]) -> int:
    n = len(nums)

    def need(i: int) -> int:
        return max(0, max(nums[i - 1], nums[i + 1]) + 1 - nums[i])

    if n % 2 == 1:
        return sum(need(i) for i in range(1, n - 1, 2))
    m = (n - 2) // 2
    odd = [0]
    for i in range(1, n - 1, 2):
        odd.append(odd[-1] + need(i))
    even = [0] * (m + 1)
    for t in range(m - 1, -1, -1):
        even[t] = even[t + 1] + need(2 * t + 2)
    return min(odd[t] + even[t] for t in range(m + 1))
