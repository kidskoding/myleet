def max_boxes_in_warehouse(boxes: list[int], warehouse: list[int]) -> int:
    left, right = 0, len(warehouse) - 1
    placed = 0
    for box in sorted(boxes, reverse=True):
        if left > right:
            break
        if box <= warehouse[left]:
            left += 1
            placed += 1
        elif box <= warehouse[right]:
            right -= 1
            placed += 1
    return placed
