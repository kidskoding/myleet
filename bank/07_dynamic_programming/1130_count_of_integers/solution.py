from functools import cache

MOD = 10**9 + 7


def count(num1: str, num2: str, min_sum: int, max_sum: int) -> int:
    def at_most(bound: str) -> int:
        @cache
        def go(pos: int, total: int, tight: bool) -> int:
            if total > max_sum:
                return 0
            if pos == len(bound):
                return 1 if total >= min_sum else 0
            limit = int(bound[pos]) if tight else 9
            return sum(go(pos + 1, total + d, tight and d == limit) for d in range(limit + 1)) % MOD

        return go(0, 0, True)

    num1_good = min_sum <= sum(map(int, num1)) <= max_sum
    return (at_most(num2) - at_most(num1) + num1_good) % MOD
