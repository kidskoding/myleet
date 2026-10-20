class Allocator:
    # Problem 593: Design Memory Allocator
    # Time:
    # Space:

    def __init__(self, n: int) -> None:
        raise NotImplementedError

    def allocate(self, size: int, m_id: int) -> int:
        raise NotImplementedError

    def free_memory(self, m_id: int) -> int:
        raise NotImplementedError
