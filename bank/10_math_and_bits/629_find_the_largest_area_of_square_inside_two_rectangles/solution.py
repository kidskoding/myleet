def largest_square_area(bottom_left: list[list[int]], top_right: list[list[int]]) -> int:
    best = 0
    n = len(bottom_left)
    for i in range(n):
        for j in range(i + 1, n):
            width = min(top_right[i][0], top_right[j][0]) - max(bottom_left[i][0], bottom_left[j][0])
            height = min(top_right[i][1], top_right[j][1]) - max(bottom_left[i][1], bottom_left[j][1])
            best = max(best, min(width, height))
    return best * best
