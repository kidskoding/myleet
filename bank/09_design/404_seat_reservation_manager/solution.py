import heapq


class SeatManager:
    def __init__(self, n: int) -> None:
        # Time: O(1).
        # Space: O(k) for the returned seats.
        self.next_seat = 1
        self.free: list[int] = []

    def reserve(self) -> int:
        # Time: O(log k).
        # Space: O(1).
        if self.free:
            return heapq.heappop(self.free)
        seat = self.next_seat
        self.next_seat += 1
        return seat

    def unreserve(self, seat_number: int) -> None:
        # Time: O(log k).
        # Space: O(1).
        heapq.heappush(self.free, seat_number)
