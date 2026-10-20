from bisect import bisect_left, bisect_right
from collections import defaultdict, deque


class Router:
    def __init__(self, memory_limit: int) -> None:
        self.limit = memory_limit
        self.queue: deque[tuple[int, int, int]] = deque()
        self.seen: set[tuple[int, int, int]] = set()
        self.times: dict[int, list[int]] = defaultdict(list)
        self.start: dict[int, int] = defaultdict(int)

    def _pop(self) -> tuple[int, int, int]:
        packet = self.queue.popleft()
        self.seen.remove(packet)
        self.start[packet[1]] += 1
        return packet

    def add_packet(self, source: int, destination: int, timestamp: int) -> bool:
        packet = (source, destination, timestamp)
        if packet in self.seen:
            return False
        if len(self.queue) == self.limit:
            self._pop()
        self.queue.append(packet)
        self.seen.add(packet)
        self.times[destination].append(timestamp)
        return True

    def forward_packet(self) -> list[int]:
        if not self.queue:
            return []
        return list(self._pop())

    def get_count(self, destination: int, start_time: int, end_time: int) -> int:
        times = self.times[destination]
        lo = self.start[destination]
        return bisect_right(times, end_time, lo) - bisect_left(times, start_time, lo)
