class RideSharingSystem:
    # Problem 594: Design Ride Sharing System
    # Time:
    # Space:

    def __init__(self) -> None:
        raise NotImplementedError

    def add_rider(self, rider_id: int) -> None:
        raise NotImplementedError

    def add_driver(self, driver_id: int) -> None:
        raise NotImplementedError

    def match_driver_with_rider(self) -> list[int]:
        raise NotImplementedError

    def cancel_rider(self, rider_id: int) -> None:
        raise NotImplementedError
