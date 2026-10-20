def image_smoother(img: list[list[int]]) -> list[list[int]]:
    m, n = len(img), len(img[0])
    out = [[0] * n for _ in range(m)]
    for r in range(m):
        for c in range(n):
            total = count = 0
            for nr in range(max(0, r - 1), min(m, r + 2)):
                for nc in range(max(0, c - 1), min(n, c + 2)):
                    total += img[nr][nc]
                    count += 1
            out[r][c] = total // count
    return out
