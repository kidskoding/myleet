from math import gcd


def make_sub_k_sum_equal(arr: list[int], k: int) -> int:
    step = gcd(len(arr), k)
    total = 0
    for start in range(step):
        group = sorted(arr[start::step])
        median = group[len(group) // 2]
        total += sum(abs(x - median) for x in group)
    return total
