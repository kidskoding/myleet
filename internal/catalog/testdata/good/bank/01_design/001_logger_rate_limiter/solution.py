class Logger:
    def __init__(self) -> None:
        self.last: dict[str, int] = {}

    def should_print_message(self, timestamp: int, message: str) -> bool:
        if timestamp < self.last.get(message, -10):
            return False
        self.last[message] = timestamp + 10
        return True
