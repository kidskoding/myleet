from __future__ import annotations


class Employee:
    # Node for Employee Importance.
    def __init__(
        self,
        id: int,
        importance: int,
        subordinates: list[int],
    ) -> None:
        self.id = id
        self.importance = importance
        self.subordinates = subordinates


def get_importance(employees: list[Employee], id: int) -> int:
    # Problem 3: Employee Importance
    # Time:
    # Space:

    raise NotImplementedError
