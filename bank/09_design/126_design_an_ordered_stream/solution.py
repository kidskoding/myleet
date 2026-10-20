class OrderedStream:
    def __init__(self, n: int) -> None:
        self.slots: list[str | None] = [None] * (n + 1)
        self.ptr = 1

    def insert(self, id_key: int, value: str) -> list[str]:
        self.slots[id_key] = value
        out: list[str] = []
        while self.ptr < len(self.slots):
            item = self.slots[self.ptr]
            if item is None:
                break
            out.append(item)
            self.ptr += 1
        return out
