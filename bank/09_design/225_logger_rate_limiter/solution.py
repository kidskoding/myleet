class Logger:
    def __init__(self) -> None:
        self.next_allowed: dict[str, int] = {}

    def should_print_message(self, timestamp: int, message: str) -> bool:
        if timestamp < self.next_allowed.get(message, timestamp):
            return False
        self.next_allowed[message] = timestamp + 10
        return True
