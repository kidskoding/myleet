class TaskManager:
    # Problem 597: Design Task Manager
    # Time:
    # Space:

    def __init__(self, tasks: list[list[int]]) -> None:
        raise NotImplementedError

    def add(self, user_id: int, task_id: int, priority: int) -> None:
        raise NotImplementedError

    def edit(self, task_id: int, new_priority: int) -> None:
        raise NotImplementedError

    def rmv(self, task_id: int) -> None:
        raise NotImplementedError

    def exec_top(self) -> int:
        raise NotImplementedError
