def minimum_cost(nums: list[int], k: int, dist: int) -> int:
    values = sorted(set(nums[1:]))
    rank = {v: i + 1 for i, v in enumerate(values)}
    size = len(values)
    count = [0] * (size + 1)
    total = [0] * (size + 1)

    def update(x: int, delta: int) -> None:
        i = rank[x]
        while i <= size:
            count[i] += delta
            total[i] += delta * x
            i += i & -i

    def smallest_sum(m: int) -> int:
        pos = 0
        acc = 0
        step = 1 << size.bit_length()
        while step:
            nxt = pos + step
            if nxt <= size and count[nxt] < m:
                pos = nxt
                m -= count[nxt]
                acc += total[nxt]
            step >>= 1
        return acc + m * values[pos]

    width = dist + 1
    need = k - 1
    for i in range(1, width + 1):
        update(nums[i], 1)
    best = smallest_sum(need)
    for i in range(width + 1, len(nums)):
        update(nums[i], 1)
        update(nums[i - width], -1)
        best = min(best, smallest_sum(need))
    return nums[0] + best
