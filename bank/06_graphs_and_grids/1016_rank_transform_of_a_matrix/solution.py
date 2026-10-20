from collections import defaultdict


def matrix_rank_transform(matrix: list[list[int]]) -> list[list[int]]:
    m, n = len(matrix), len(matrix[0])
    by_value: dict[int, list[tuple[int, int]]] = defaultdict(list)
    for r in range(m):
        for c in range(n):
            by_value[matrix[r][c]].append((r, c))
    line_rank = [0] * (m + n)
    answer = [[0] * n for _ in range(m)]
    for value in sorted(by_value):
        parent: dict[int, int] = {}

        def find(x: int) -> int:
            parent.setdefault(x, x)
            while parent[x] != x:
                parent[x] = parent[parent[x]]
                x = parent[x]
            return x

        for r, c in by_value[value]:
            parent[find(r)] = find(m + c)
        group_rank: dict[int, int] = defaultdict(int)
        for line in list(parent):
            root = find(line)
            group_rank[root] = max(group_rank[root], line_rank[line])
        for r, c in by_value[value]:
            rank = group_rank[find(r)] + 1
            answer[r][c] = rank
        for line in list(parent):
            line_rank[line] = group_rank[find(line)] + 1
    return answer
