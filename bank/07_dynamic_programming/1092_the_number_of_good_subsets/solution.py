from collections import Counter

MOD = 10**9 + 7
PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]


def number_of_good_subsets(nums: list[int]) -> int:
    count = Counter(nums)
    dp = [0] * (1 << len(PRIMES))
    dp[0] = 1
    for value in range(2, 31):
        if count[value] == 0:
            continue
        mask = 0
        square_free = True
        for i, p in enumerate(PRIMES):
            if value % (p * p) == 0:
                square_free = False
                break
            if value % p == 0:
                mask |= 1 << i
        if not square_free:
            continue
        for state in range(len(dp) - 1, -1, -1):
            if dp[state] and state & mask == 0:
                dp[state | mask] = (dp[state | mask] + dp[state] * count[value]) % MOD
    total = sum(dp[1:]) % MOD
    return total * pow(2, count[1], MOD) % MOD
