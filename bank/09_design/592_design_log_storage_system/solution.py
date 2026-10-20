PREFIX = {"Year": 4, "Month": 7, "Day": 10, "Hour": 13, "Minute": 16, "Second": 19}


class LogSystem:
    def __init__(self) -> None:
        self.logs: list[tuple[int, str]] = []

    def put(self, log_id: int, timestamp: str) -> None:
        self.logs.append((log_id, timestamp))

    def retrieve(self, start: str, end: str, granularity: str) -> list[int]:
        cut = PREFIX[granularity]
        low, high = start[:cut], end[:cut]
        return [log_id for log_id, stamp in self.logs if low <= stamp[:cut] <= high]
