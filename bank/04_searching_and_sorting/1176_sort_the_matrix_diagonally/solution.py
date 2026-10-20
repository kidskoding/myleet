from collections import defaultdict


def diagonal_sort(mat: list[list[int]]) -> list[list[int]]:
    groups: dict[int, list[int]] = defaultdict(list)
    for i, row in enumerate(mat):
        for j, v in enumerate(row):
            groups[i - j].append(v)
    for values in groups.values():
        values.sort(reverse=True)
    return [[groups[i - j].pop() for j in range(len(row))] for i, row in enumerate(mat)]
