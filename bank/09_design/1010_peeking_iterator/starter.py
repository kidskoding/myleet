class Iterator:
    def __init__(self, nums: list[int]) -> None:
        self._nums = nums
        self._index = 0

    def has_next(self) -> bool:
        return self._index < len(self._nums)

    def next(self) -> int:
        value = self._nums[self._index]
        self._index += 1
        return value


class PeekingIterator:
    # Problem 1010: Peeking Iterator
    # Time:
    # Space:

    def __init__(self, iterator: Iterator) -> None:
        raise NotImplementedError

    def peek(self) -> int:
        raise NotImplementedError

    def next(self) -> int:
        raise NotImplementedError

    def has_next(self) -> bool:
        raise NotImplementedError
