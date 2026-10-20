def find_buildings(heights: list[int]) -> list[int]:
    out: list[int] = []
    tallest = 0
    for i in range(len(heights) - 1, -1, -1):
        if heights[i] > tallest:
            out.append(i)
            tallest = heights[i]
    out.reverse()
    return out
