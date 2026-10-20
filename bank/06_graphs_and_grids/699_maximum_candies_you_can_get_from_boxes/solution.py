from collections import deque


def max_candies(
    status: list[int],
    candies: list[int],
    keys: list[list[int]],
    contained_boxes: list[list[int]],
    initial_boxes: list[int],
) -> int:
    n = len(status)
    can_open = [s == 1 for s in status]
    have = [False] * n
    opened = [False] * n
    queue: deque[int] = deque()

    def try_open(box: int) -> None:
        if have[box] and can_open[box] and not opened[box]:
            opened[box] = True
            queue.append(box)

    for box in initial_boxes:
        have[box] = True
        try_open(box)
    total = 0
    while queue:
        box = queue.popleft()
        total += candies[box]
        for key in keys[box]:
            can_open[key] = True
            try_open(key)
        for inner in contained_boxes[box]:
            have[inner] = True
            try_open(inner)
    return total
