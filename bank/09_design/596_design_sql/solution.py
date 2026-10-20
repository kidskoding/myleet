class SQL:
    def __init__(self, names: list[str], columns: list[int]) -> None:
        self.columns = dict(zip(names, columns))
        self.next_id = {name: 1 for name in names}
        self.rows: dict[str, dict[int, list[str]]] = {name: {} for name in names}

    def ins(self, name: str, row: list[str]) -> bool:
        if self.columns.get(name) != len(row):
            return False
        self.rows[name][self.next_id[name]] = row
        self.next_id[name] += 1
        return True

    def rmv(self, name: str, row_id: int) -> None:
        if name in self.rows:
            self.rows[name].pop(row_id, None)

    def sel(self, name: str, row_id: int, column_id: int) -> str:
        row = self.rows.get(name, {}).get(row_id)
        if row is None or not 1 <= column_id <= len(row):
            return "<null>"
        return row[column_id - 1]

    def exp(self, name: str) -> list[str]:
        return [",".join([str(row_id), *row]) for row_id, row in self.rows.get(name, {}).items()]
