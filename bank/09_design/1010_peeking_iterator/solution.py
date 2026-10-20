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
    def __init__(self, iterator: Iterator) -> None:
        self._iterator = iterator
        self._has_buffer = iterator.has_next()
        self._buffer = iterator.next() if self._has_buffer else 0

    def peek(self) -> int:
        return self._buffer

    def next(self) -> int:
        value = self._buffer
        self._has_buffer = self._iterator.has_next()
        self._buffer = self._iterator.next() if self._has_buffer else 0
        return value

    def has_next(self) -> bool:
        return self._has_buffer
