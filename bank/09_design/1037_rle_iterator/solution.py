class RLEIterator:
    def __init__(self, encoding: list[int]) -> None:
        self.encoding = encoding
        self.index = 0

    def next(self, n: int) -> int:
        while self.index < len(self.encoding):
            count = self.encoding[self.index]
            if n <= count:
                self.encoding[self.index] = count - n
                return self.encoding[self.index + 1]
            n -= count
            self.index += 2
        return -1
