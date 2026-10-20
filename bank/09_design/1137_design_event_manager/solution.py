import heapq


class EventManager:
    def __init__(self, events: list[list[int]]) -> None:
        self.priority = {event_id: priority for event_id, priority in events}
        self.heap = [(-priority, event_id) for event_id, priority in events]
        heapq.heapify(self.heap)

    def update_priority(self, event_id: int, new_priority: int) -> None:
        self.priority[event_id] = new_priority
        heapq.heappush(self.heap, (-new_priority, event_id))

    def poll_highest(self) -> int:
        while self.heap:
            neg_priority, event_id = heapq.heappop(self.heap)
            if self.priority.get(event_id) == -neg_priority:
                del self.priority[event_id]
                return event_id
        return -1
