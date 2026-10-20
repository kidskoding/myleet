def min_cost(costs: list[list[int]]) -> int:
    red = green = blue = 0
    for r, g, b in costs:
        red, green, blue = r + min(green, blue), g + min(red, blue), b + min(red, green)
    return min(red, green, blue)
