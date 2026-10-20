from bisect import bisect_right


def matrix_median(grid: list[list[int]]) -> int:
    half = len(grid) * len(grid[0]) // 2
    low = min(row[0] for row in grid)
    high = max(row[-1] for row in grid)
    while low < high:
        mid = (low + high) // 2
        if sum(bisect_right(row, mid) for row in grid) > half:
            high = mid
        else:
            low = mid + 1
    return low
