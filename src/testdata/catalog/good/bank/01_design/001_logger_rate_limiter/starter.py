class Logger:
    def __init__(self) -> None:
        raise NotImplementedError

    def should_print_message(self, timestamp: int, message: str) -> bool:
        raise NotImplementedError
