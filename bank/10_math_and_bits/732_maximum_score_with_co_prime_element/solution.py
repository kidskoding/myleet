def max_score(nums: list[int], max_val: int) -> int:
    limit = max(max(nums), max_val)
    freq = [0] * (limit + 1)
    for value in nums:
        freq[value] += 1
    multiples = [0] * (limit + 1)
    for d in range(2, limit + 1):
        multiples[d] = sum(freq[d::d])
    smallest = list(range(limit + 1))
    for p in range(2, int(limit**0.5) + 1):
        if smallest[p] == p:
            for q in range(p * p, limit + 1, p):
                if smallest[q] == q:
                    smallest[q] = p

    def sharers(x: int) -> int:
        primes = []
        while x > 1:
            p = smallest[x]
            primes.append(p)
            while x % p == 0:
                x //= p
        total = 0
        for mask in range(1, 1 << len(primes)):
            product = 1
            for i, p in enumerate(primes):
                if mask >> i & 1:
                    product *= p
            total += multiples[product] if bin(mask).count("1") % 2 else -multiples[product]
        return total

    best = max(v - (sharers(v) - (1 if v > 1 else 0)) for v in set(nums))
    for x in range(1, max_val + 1):
        best = max(best, x - max(1, sharers(x)))
    return best
