def result_grid(image: list[list[int]], threshold: int) -> list[list[int]]:
    rows, cols = len(image), len(image[0])
    sums = [[0] * cols for _ in range(rows)]
    counts = [[0] * cols for _ in range(rows)]

    def valid(top: int, left: int) -> bool:
        for r in range(top, top + 3):
            for c in range(left, left + 3):
                if c + 1 < left + 3 and abs(image[r][c] - image[r][c + 1]) > threshold:
                    return False
                if r + 1 < top + 3 and abs(image[r][c] - image[r + 1][c]) > threshold:
                    return False
        return True

    for top in range(rows - 2):
        for left in range(cols - 2):
            if not valid(top, left):
                continue
            average = sum(image[r][c] for r in range(top, top + 3) for c in range(left, left + 3)) // 9
            for r in range(top, top + 3):
                for c in range(left, left + 3):
                    sums[r][c] += average
                    counts[r][c] += 1

    return [[sums[r][c] // counts[r][c] if counts[r][c] else image[r][c] for c in range(cols)] for r in range(rows)]
