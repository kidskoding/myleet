def minimum_boxes(apple: list[int], capacity: list[int]) -> int:
    left = sum(apple)
    for used, size in enumerate(sorted(capacity, reverse=True), start=1):
        left -= size
        if left <= 0:
            return used
    return len(capacity)
