from collections import Counter


class DetectSquares:
    def __init__(self) -> None:
        self.points: Counter[tuple[int, int]] = Counter()

    def add(self, point: list[int]) -> None:
        self.points[(point[0], point[1])] += 1

    def count(self, point: list[int]) -> int:
        qx, qy = point
        total = 0
        for (x, y), seen in self.points.items():
            if abs(x - qx) != abs(y - qy) or x == qx:
                continue
            total += seen * self.points[(qx, y)] * self.points[(x, qy)]
        return total
