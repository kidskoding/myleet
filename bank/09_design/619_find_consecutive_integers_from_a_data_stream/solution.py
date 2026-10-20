class DataStream:
    def __init__(self, value: int, k: int) -> None:
        self.value = value
        self.k = k
        self.run = 0

    def consec(self, num: int) -> bool:
        self.run = self.run + 1 if num == self.value else 0
        return self.run >= self.k
