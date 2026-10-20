def min_cost_ii(costs: list[list[int]]) -> int:
    if not costs:
        return 0
    prev = [0] * len(costs[0])
    for row in costs:
        first = second = float("inf")
        first_color = -1
        for color, total in enumerate(prev):
            if total < first:
                first, second, first_color = total, first, color
            elif total < second:
                second = total
        if len(prev) == 1:
            second = first
        prev = [cost + (second if color == first_color else first) for color, cost in enumerate(row)]
    return int(min(prev))
