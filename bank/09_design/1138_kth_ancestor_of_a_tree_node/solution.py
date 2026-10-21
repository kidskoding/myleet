class TreeAncestor:
    def __init__(self, n: int, parent: list[int]) -> None:
        self.bits = n.bit_length()
        self.up = [[-1] * n for _ in range(self.bits)]
        self.up[0] = parent[:]
        for j in range(1, self.bits):
            for i in range(n):
                mid = self.up[j - 1][i]
                self.up[j][i] = -1 if mid == -1 else self.up[j - 1][mid]

    def get_kth_ancestor(self, node: int, k: int) -> int:
        for j in range(self.bits):
            if k & (1 << j):
                node = self.up[j][node]
                if node == -1:
                    return -1
        return node
