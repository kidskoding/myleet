class Spreadsheet:
    def __init__(self, rows: int) -> None:
        self.cells: dict[str, int] = {}

    def set_cell(self, cell: str, value: int) -> None:
        self.cells[cell] = value

    def reset_cell(self, cell: str) -> None:
        self.cells.pop(cell, None)

    def get_value(self, formula: str) -> int:
        return sum(self._operand(part) for part in formula[1:].split("+"))

    def _operand(self, token: str) -> int:
        return int(token) if token[0].isdigit() else self.cells.get(token, 0)
