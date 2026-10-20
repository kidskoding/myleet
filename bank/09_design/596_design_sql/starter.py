class SQL:
    # Problem 596: Design SQL
    # Time:
    # Space:

    def __init__(self, names: list[str], columns: list[int]) -> None:
        raise NotImplementedError

    def ins(self, name: str, row: list[str]) -> bool:
        raise NotImplementedError

    def rmv(self, name: str, row_id: int) -> None:
        raise NotImplementedError

    def sel(self, name: str, row_id: int, column_id: int) -> str:
        raise NotImplementedError

    def exp(self, name: str) -> list[str]:
        raise NotImplementedError
