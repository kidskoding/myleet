MOD = 10**9 + 7


def count_palindromes(s: str) -> int:
    digits = [int(c) for c in s]
    right_count = [0] * 10
    right_pairs = [[0] * 10 for _ in range(10)]
    for d in reversed(digits):
        for y in range(10):
            right_pairs[d][y] += right_count[y]
        right_count[d] += 1
    left_count = [0] * 10
    left_pairs = [[0] * 10 for _ in range(10)]
    total = 0
    for d in digits:
        right_count[d] -= 1
        for y in range(10):
            right_pairs[d][y] -= right_count[y]
        for a in range(10):
            for b in range(10):
                total += left_pairs[a][b] * right_pairs[b][a]
        for x in range(10):
            left_pairs[x][d] += left_count[x]
        left_count[d] += 1
    return total % MOD
