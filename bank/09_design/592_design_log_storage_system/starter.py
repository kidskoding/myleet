class LogSystem:
    # Problem 592: Design Log Storage System
    # Time:
    # Space:

    def __init__(self) -> None:
        raise NotImplementedError

    def put(self, log_id: int, timestamp: str) -> None:
        raise NotImplementedError

    def retrieve(self, start: str, end: str, granularity: str) -> list[int]:
        raise NotImplementedError
