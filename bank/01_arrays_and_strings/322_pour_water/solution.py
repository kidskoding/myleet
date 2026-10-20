def pour_water(heights: list[int], volume: int, k: int) -> list[int]:
    h = list(heights)
    for _ in range(volume):
        best = k
        i = k
        while i > 0 and h[i - 1] <= h[i]:
            i -= 1
            if h[i] < h[best]:
                best = i
        if best == k:
            i = k
            while i < len(h) - 1 and h[i + 1] <= h[i]:
                i += 1
                if h[i] < h[best]:
                    best = i
        h[best] += 1
    return h
