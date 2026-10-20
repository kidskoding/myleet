class EventManager:
    # Problem 1137: Design Event Manager
    # Time:
    # Space:

    def __init__(self, events: list[list[int]]) -> None:
        raise NotImplementedError

    def update_priority(self, event_id: int, new_priority: int) -> None:
        raise NotImplementedError

    def poll_highest(self) -> int:
        raise NotImplementedError
