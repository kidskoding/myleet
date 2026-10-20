def color_the_array(n: int, queries: list[list[int]]) -> list[int]:
    colors = [0] * n
    pairs = 0
    result = []
    for i, color in queries:
        old = colors[i]
        for j in (i - 1, i + 1):
            if 0 <= j < n and colors[j]:
                if colors[j] == old:
                    pairs -= 1
                if colors[j] == color:
                    pairs += 1
        colors[i] = color
        result.append(pairs)
    return result
