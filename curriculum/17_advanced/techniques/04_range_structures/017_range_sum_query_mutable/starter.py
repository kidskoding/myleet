class FenwickTree:
    # Shared 1-indexed binary indexed tree supporting point update and prefix sum query.

    def __init__(self, n: int) -> None:
        raise NotImplementedError

    def update(self, index: int, delta: int) -> None:
        raise NotImplementedError

    def prefix_sum(self, index: int) -> int:
        raise NotImplementedError

    def range_sum(self, left: int, right: int) -> int:
        raise NotImplementedError


class NumArray:
    # Problem 17: Range Sum Query - Mutable

    def __init__(self, nums: list[int]) -> None:
        # Time:
        # Space:

        raise NotImplementedError

    def update(self, index: int, val: int) -> None:
        # Time:
        # Space:

        raise NotImplementedError

    def sum_range(self, left: int, right: int) -> int:
        # Time:
        # Space:

        raise NotImplementedError
