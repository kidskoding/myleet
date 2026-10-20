def task_scheduler_ii(tasks: list[int], space: int) -> int:
    # Time: O(n).
    # Space: O(distinct task types).
    next_allowed: dict[int, int] = {}
    day = 0
    for t in tasks:
        day = max(day + 1, next_allowed.get(t, 0))
        next_allowed[t] = day + space + 1
    return day
