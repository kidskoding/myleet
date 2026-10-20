def max_boxes_in_warehouse(boxes: list[int], warehouse: list[int]) -> int:
    limits = []
    lowest = float("inf")
    for height in warehouse:
        lowest = min(lowest, height)
        limits.append(lowest)
    ordered = sorted(boxes)
    placed = 0
    for limit in reversed(limits):
        if placed < len(ordered) and ordered[placed] <= limit:
            placed += 1
    return placed
