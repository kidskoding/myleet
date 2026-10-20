class Allocator:
    def __init__(self, n: int) -> None:
        self.memory = [0] * n

    def allocate(self, size: int, m_id: int) -> int:
        run = 0
        for i, owner in enumerate(self.memory):
            run = run + 1 if owner == 0 else 0
            if run == size:
                start = i - size + 1
                self.memory[start : i + 1] = [m_id] * size
                return start
        return -1

    def free_memory(self, m_id: int) -> int:
        freed = 0
        for i, owner in enumerate(self.memory):
            if owner == m_id:
                self.memory[i] = 0
                freed += 1
        return freed
