MOD = 10**9 + 7


def count_ways(ranges: list[list[int]]) -> int:
    groups = 0
    reach = -1
    for start, end in sorted(ranges):
        if start > reach:
            groups += 1
        reach = max(reach, end)
    return pow(2, groups, MOD)
