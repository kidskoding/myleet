MOD = 10**9 + 7


def first_day_been_in_all_rooms(next_visit: list[int]) -> int:
    n = len(next_visit)
    first = [0] * n
    for i in range(n - 1):
        first[i + 1] = (2 * first[i] - first[next_visit[i]] + 2) % MOD
    return first[n - 1]
