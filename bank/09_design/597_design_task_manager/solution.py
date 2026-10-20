import heapq


class TaskManager:
    def __init__(self, tasks: list[list[int]]) -> None:
        self.tasks: dict[int, tuple[int, int]] = {}
        self.heap: list[tuple[int, int]] = []
        for user_id, task_id, priority in tasks:
            self.add(user_id, task_id, priority)

    def add(self, user_id: int, task_id: int, priority: int) -> None:
        self.tasks[task_id] = (user_id, priority)
        heapq.heappush(self.heap, (-priority, -task_id))

    def edit(self, task_id: int, new_priority: int) -> None:
        self.add(self.tasks[task_id][0], task_id, new_priority)

    def rmv(self, task_id: int) -> None:
        del self.tasks[task_id]

    def exec_top(self) -> int:
        while self.heap:
            neg_priority, neg_task = heapq.heappop(self.heap)
            current = self.tasks.get(-neg_task)
            if current is not None and current[1] == -neg_priority:
                del self.tasks[-neg_task]
                return current[0]
        return -1
