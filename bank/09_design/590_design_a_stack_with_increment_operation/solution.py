class CustomStack:
    def __init__(self, max_size: int) -> None:
        self.max_size = max_size
        self.values: list[int] = []
        self.pending: list[int] = []

    def push(self, x: int) -> None:
        if len(self.values) < self.max_size:
            self.values.append(x)
            self.pending.append(0)

    def pop(self) -> int:
        if not self.values:
            return -1
        extra = self.pending.pop()
        if self.pending:
            self.pending[-1] += extra
        return self.values.pop() + extra

    def increment(self, k: int, val: int) -> None:
        top = min(k, len(self.values)) - 1
        if top >= 0:
            self.pending[top] += val
