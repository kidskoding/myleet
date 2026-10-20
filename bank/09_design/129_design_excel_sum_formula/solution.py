from collections import Counter


class Excel:
    def __init__(self, height: int, width: str) -> None:
        self.values: dict[tuple[int, str], int] = {}
        self.formulas: dict[tuple[int, str], Counter[tuple[int, str]]] = {}

    def set(self, row: int, column: str, val: int) -> None:
        self.formulas.pop((row, column), None)
        self.values[(row, column)] = val

    def get(self, row: int, column: str) -> int:
        formula = self.formulas.get((row, column))
        if formula is None:
            return self.values.get((row, column), 0)
        return sum(times * self.get(r, c) for (r, c), times in formula.items())

    def sum(self, row: int, column: str, numbers: list[str]) -> int:
        refs: Counter[tuple[int, str]] = Counter()
        for item in numbers:
            start, _, end = item.partition(":")
            end = end or start
            for r in range(int(start[1:]), int(end[1:]) + 1):
                for c in range(ord(start[0]), ord(end[0]) + 1):
                    refs[(r, chr(c))] += 1
        self.formulas[(row, column)] = refs
        return self.get(row, column)
