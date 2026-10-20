import bisect


class ExamRoom:
    def __init__(self, n: int) -> None:
        self.n = n
        self.seats: list[int] = []

    def seat(self) -> int:
        if not self.seats:
            choice = 0
        else:
            choice, best = 0, self.seats[0]
            for left, right in zip(self.seats, self.seats[1:]):
                if (right - left) // 2 > best:
                    best, choice = (right - left) // 2, left + (right - left) // 2
            if self.n - 1 - self.seats[-1] > best:
                choice = self.n - 1
        bisect.insort(self.seats, choice)
        return choice

    def leave(self, p: int) -> None:
        self.seats.remove(p)
