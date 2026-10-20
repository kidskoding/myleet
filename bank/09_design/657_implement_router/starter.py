class Router:
    # Problem 657: Implement Router
    # Time:
    # Space:

    def __init__(self, memory_limit: int) -> None:
        raise NotImplementedError

    def add_packet(self, source: int, destination: int, timestamp: int) -> bool:
        raise NotImplementedError

    def forward_packet(self) -> list[int]:
        raise NotImplementedError

    def get_count(self, destination: int, start_time: int, end_time: int) -> int:
        raise NotImplementedError
