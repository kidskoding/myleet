from collections import deque


def max_task_assign(tasks: list[int], workers: list[int], pills: int, strength: int) -> int:
    tasks = sorted(tasks)
    workers = sorted(workers)

    def feasible(k: int) -> bool:
        chosen_workers = workers[len(workers) - k :]
        reachable: deque[int] = deque()
        next_task = 0
        left_pills = pills
        for worker in chosen_workers:
            while next_task < k and tasks[next_task] <= worker + strength:
                reachable.append(tasks[next_task])
                next_task += 1
            if not reachable:
                return False
            if reachable[0] <= worker:
                reachable.popleft()
            elif left_pills > 0:
                reachable.pop()
                left_pills -= 1
            else:
                return False
        return True

    lo, hi = 0, min(len(tasks), len(workers))
    while lo < hi:
        mid = (lo + hi + 1) // 2
        if feasible(mid):
            lo = mid
        else:
            hi = mid - 1
    return lo
