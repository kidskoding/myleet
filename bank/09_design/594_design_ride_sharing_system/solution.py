from collections import deque


class RideSharingSystem:
    def __init__(self) -> None:
        self.riders: dict[int, None] = {}
        self.drivers: deque[int] = deque()

    def add_rider(self, rider_id: int) -> None:
        self.riders[rider_id] = None

    def add_driver(self, driver_id: int) -> None:
        self.drivers.append(driver_id)

    def match_driver_with_rider(self) -> list[int]:
        if not self.riders or not self.drivers:
            return [-1, -1]
        rider = next(iter(self.riders))
        del self.riders[rider]
        return [self.drivers.popleft(), rider]

    def cancel_rider(self, rider_id: int) -> None:
        self.riders.pop(rider_id, None)
