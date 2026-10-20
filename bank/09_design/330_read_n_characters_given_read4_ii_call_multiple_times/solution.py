from collections.abc import Callable


class Reader:
    def __init__(self, read4: Callable[[list[str]], int]) -> None:
        self.read4 = read4
        self.chunk = [""] * 4
        self.chunk_pos = 0
        self.chunk_size = 0

    def read(self, buf: list[str], n: int) -> int:
        total = 0
        while total < n:
            if self.chunk_pos == self.chunk_size:
                self.chunk_size = self.read4(self.chunk)
                self.chunk_pos = 0
                if self.chunk_size == 0:
                    break
            buf[total] = self.chunk[self.chunk_pos]
            self.chunk_pos += 1
            total += 1
        return total
