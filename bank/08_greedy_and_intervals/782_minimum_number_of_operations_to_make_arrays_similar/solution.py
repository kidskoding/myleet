def make_similar(nums: list[int], target: list[int]) -> int:
    total = 0
    for parity in (0, 1):
        a = sorted(x for x in nums if x % 2 == parity)
        b = sorted(x for x in target if x % 2 == parity)
        total += sum(x - y for x, y in zip(a, b) if x > y)
    return total // 2
