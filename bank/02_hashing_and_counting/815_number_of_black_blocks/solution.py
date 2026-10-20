from collections import Counter


def count_black_blocks(m: int, n: int, coordinates: list[list[int]]) -> list[int]:
    blocks: Counter[tuple[int, int]] = Counter()
    for x, y in coordinates:
        for r in (x - 1, x):
            for c in (y - 1, y):
                if 0 <= r < m - 1 and 0 <= c < n - 1:
                    blocks[(r, c)] += 1
    result = [0] * 5
    for count in blocks.values():
        result[count] += 1
    result[0] = (m - 1) * (n - 1) - len(blocks)
    return result
