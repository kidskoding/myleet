from __future__ import annotations


class SparseVector:
    def __init__(self, nums: list[int]) -> None:
        self.entries = {i: value for i, value in enumerate(nums) if value != 0}

    def dot_product(self, vec: SparseVector) -> int:
        small, large = self.entries, vec.entries
        if len(small) > len(large):
            small, large = large, small
        return sum(value * large.get(i, 0) for i, value in small.items())
