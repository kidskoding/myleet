class Spreadsheet:
    # Problem 595: Design Spreadsheet
    # Time:
    # Space:

    def __init__(self, rows: int) -> None:
        raise NotImplementedError

    def set_cell(self, cell: str, value: int) -> None:
        raise NotImplementedError

    def reset_cell(self, cell: str) -> None:
        raise NotImplementedError

    def get_value(self, formula: str) -> int:
        raise NotImplementedError
