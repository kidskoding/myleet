MOD = 10**9 + 7
LIMIT = 5000


def count_arrays(digit_sum: list[int]) -> int:
    buckets: list[list[int]] = [[] for _ in range(51)]
    for v in range(LIMIT + 1):
        buckets[sum(map(int, str(v)))].append(v)
    prev_vals = buckets[digit_sum[0]]
    prev_ways = [1] * len(prev_vals)
    for target in digit_sum[1:]:
        vals = buckets[target]
        ways: list[int] = []
        j = 0
        running = 0
        for v in vals:
            while j < len(prev_vals) and prev_vals[j] <= v:
                running += prev_ways[j]
                j += 1
            ways.append(running % MOD)
        prev_vals, prev_ways = vals, ways
    return sum(prev_ways) % MOD
