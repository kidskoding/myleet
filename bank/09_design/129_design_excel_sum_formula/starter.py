class Excel:
    # Problem 129: Design Excel Sum Formula
    # Time:
    # Space:

    def __init__(self, height: int, width: str) -> None:
        raise NotImplementedError

    def set(self, row: int, column: str, val: int) -> None:
        raise NotImplementedError

    def get(self, row: int, column: str) -> int:
        raise NotImplementedError

    def sum(self, row: int, column: str, numbers: list[str]) -> int:
        raise NotImplementedError
